# app/routes/tasks.py
# Task routes: list inbox, view, generate, run tests, and submit.
#
# generate_task: calls Anthropic to create a real task tailored to the user's
#                language and level; falls back to seed templates if unavailable.
#
# submit_task:   calls Anthropic for feedback, parses scores from the response,
#                and updates the user's CompetencyScore record in the database.

import ast
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from app import db
from app.models import Task, Submission, CompetencyScore, TaskStatus, CharacterType
from app.services.ai import generate_task as ai_generate_task, get_ai_feedback

tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")

# Character cycle order for generated tasks
_CHARACTERS = ["manager", "qa", "pm"]

# ---------------------------------------------------------------------------
# Seed fallback templates (used when AI is unavailable)
# ---------------------------------------------------------------------------

SEED_TASKS = [
    {
        "character": CharacterType.manager,
        "subject": "Quick fix needed — login button unresponsive on mobile",
        "email_body": (
            "Hey,\n\n"
            "A few customers have reported that the login button on mobile devices "
            "doesn't respond on first tap. Works fine on the second tap, but that's "
            "not acceptable for a login screen.\n\n"
            "I pulled the relevant handlers [[CODE_SNIPPET]] and it looks like the "
            "touchstart listener is non-passive, which means it's blocking the click "
            "event from reaching the button. Can you dig in and push a fix before EOD? "
            "Reproduction steps: open on iOS Safari, tap login once.\n\n"
            "Thanks,\nSarah"
        ),
        "code_snippet": (
            "// Current login button handler\n"
            "loginBtn.addEventListener('click', (e) => {\n"
            "  handleLogin();\n"
            "});\n\n"
            "// Scroll listener added elsewhere in the file\n"
            "window.addEventListener('touchstart', (e) => {\n"
            "  updateScrollPosition(e);\n"
            "}, { passive: false });\n"
        ),
    },
    {
        "character": CharacterType.qa,
        "subject": "Test failures on user registration — null email not rejected",
        "email_body": (
            "Hi,\n\n"
            "Running the regression suite this morning and found that our registration "
            "endpoint accepts a null email and creates the user record. Data integrity "
            "issue — we'll end up with unusable accounts and broken email flows.\n\n"
            "Here's the current validation [[CODE_SNIPPET]] — it only checks for an "
            "empty string, not None/null. Please fix it and return a proper 400 with "
            "a clear error message.\n\n"
            "Cheers,\nMarco (QA)"
        ),
        "code_snippet": (
            "# Current validation (broken — only checks empty string)\n"
            "def register():\n"
            "    data = request.get_json()\n"
            "    if data['email'] == '':\n"
            "        return jsonify({'error': 'Email required'}), 400\n"
            "    # ... rest of registration\n"
        ),
    },
    {
        "character": CharacterType.pm,
        "subject": "New feature request: show 'last active' on user profiles",
        "email_body": (
            "Hey team,\n\n"
            "Following up on our sprint planning — we agreed to add a 'last active' "
            "timestamp to user profile pages. Helps the community see who's still "
            "around and improves trust.\n\n"
            "Scope:\n"
            "- Track last_active_at on the User model (update on every authenticated request)\n"
            "- Expose it on GET /api/profile/:username\n"
            "- Display it on the public profile page as relative time (e.g. 'Active 2 days ago')\n\n"
            "Keep it simple — no real-time updates needed. Page refresh is fine.\n\n"
            "Thanks,\nPriya (Product)"
        ),
        "code_snippet": None,
    },
]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@tasks_bp.route("", methods=["GET"])
@login_required
def get_tasks():
    """Return all tasks for the current user, newest first."""
    tasks = (
        Task.query
        .filter_by(user_id=current_user.id)
        .order_by(Task.created_at.desc())
        .all()
    )
    return jsonify([t.to_dict() for t in tasks]), 200


@tasks_bp.route("/<int:task_id>", methods=["GET"])
@login_required
def get_task(task_id: int):
    """Return a single task by ID. Only accessible by the task's owner."""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.to_dict()), 200


@tasks_bp.route("/generate", methods=["POST"])
@login_required
def generate_task():
    """Generate a new task for the current user.

    Calls the Anthropic API to produce a task tailored to the user's language
    and level. Falls back to a seed template if the API is unavailable.
    """
    existing_count = Task.query.filter_by(user_id=current_user.id).count()
    character = _CHARACTERS[existing_count % len(_CHARACTERS)]

    # Attempt AI generation
    ai_result = ai_generate_task(
        language=current_user.language,
        level=current_user.level,
        character=character,
    )

    if ai_result:
        task = Task(
            user_id=current_user.id,
            character=CharacterType[character],
            subject=ai_result["subject"],
            email_body=ai_result["email_body"],
            code_snippet=ai_result.get("code_snippet"),
            status=TaskStatus.pending,
            deadline=datetime.now(timezone.utc) + timedelta(hours=24),
        )
    else:
        # Fall back to seed template — cycles independently of AI attempts
        template = SEED_TASKS[existing_count % len(SEED_TASKS)]
        task = Task(
            user_id=current_user.id,
            character=template["character"],
            subject=template["subject"],
            email_body=template["email_body"],
            code_snippet=template["code_snippet"],
            status=TaskStatus.pending,
            deadline=datetime.now(timezone.utc) + timedelta(hours=24),
        )

    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@tasks_bp.route("/<int:task_id>/run", methods=["POST"])
@login_required
def run_tests(task_id: int):
    """Run basic static checks on the submitted code and return test results."""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json()
    code = (data or {}).get("code", "").strip()

    results = []
    passed = 0
    failed = 0

    # Test 1: not empty
    if code:
        results.append({"test": "Code is not empty", "passed": True, "message": None})
        passed += 1
    else:
        results.append({"test": "Code is not empty", "passed": False, "message": "No code provided"})
        failed += 1
        return jsonify({"results": results, "passed": passed, "failed": failed, "total": 1}), 200

    # Test 2: Python syntax (heuristic detection)
    snippet = task.code_snippet or ""
    looks_like_python = (
        snippet.strip().startswith("#")
        or "def " in code
        or "import " in code
        or "return " in code
    )
    if looks_like_python:
        try:
            ast.parse(code)
            results.append({"test": "Valid Python syntax", "passed": True, "message": None})
            passed += 1
        except SyntaxError as e:
            results.append({
                "test": "Valid Python syntax",
                "passed": False,
                "message": f"SyntaxError line {e.lineno}: {e.msg}",
            })
            failed += 1

    # Test 3: contains non-comment implementation lines
    impl_lines = [
        l for l in code.split("\n")
        if l.strip() and not l.strip().startswith("#") and not l.strip().startswith("//")
    ]
    if len(impl_lines) >= 2:
        results.append({"test": "Contains implementation", "passed": True, "message": None})
        passed += 1
    else:
        results.append({
            "test": "Contains implementation",
            "passed": False,
            "message": "Add implementation code beyond comments",
        })
        failed += 1

    return jsonify({"results": results, "passed": passed, "failed": failed, "total": len(results)}), 200


@tasks_bp.route("/<int:task_id>/submit", methods=["POST"])
@login_required
def submit_task(task_id: int):
    """Accept a solution, get AI feedback, update competency scores.

    Expects JSON: { solution_code: string, reply_text?: string }

    Returns: { submission: {...}, updated_scores: {...} | null }
    updated_scores is null when no API key is set (scores not modified).
    """
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    if task.status == TaskStatus.reviewed:
        return jsonify({"error": "Task already reviewed"}), 409

    data = request.get_json()
    if not data or not data.get("solution_code"):
        return jsonify({"error": "solution_code is required"}), 400

    # Get feedback from Anthropic (or stub if no key)
    result = get_ai_feedback(
        task_description=task.email_body,
        code_snippet=task.code_snippet,
        solution_code=data["solution_code"],
    )

    submission = Submission(
        task_id=task.id,
        user_id=current_user.id,
        solution_code=data["solution_code"],
        ai_feedback=result["text"],
    )

    task.status = TaskStatus.submitted
    task.submitted_at = datetime.now(timezone.utc)

    db.session.add(submission)

    # Update competency scores only when real AI scores are available
    updated_scores = None
    if result["scores"] and current_user.competency:
        _blend_scores(current_user.competency, result["scores"])
        updated_scores = current_user.competency.to_dict()

    db.session.commit()

    return jsonify({
        "submission": submission.to_dict(),
        "updated_scores": updated_scores,
    }), 201


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _blend_scores(competency: CompetencyScore, new_scores: dict, weight: float = 0.35) -> None:
    """Blend new AI scores into the existing competency record.

    Uses an exponential moving average: new = old * (1 - w) + score * w
    A weight of 0.35 means recent submissions have meaningful impact but
    a single bad task doesn't tank the entire profile.
    """
    competency.delivery      = round(competency.delivery      * (1 - weight) + new_scores["delivery"]      * weight, 1)
    competency.code_quality  = round(competency.code_quality  * (1 - weight) + new_scores["code_quality"]  * weight, 1)
    competency.documentation = round(competency.documentation * (1 - weight) + new_scores["documentation"] * weight, 1)
    competency.testing       = round(competency.testing       * (1 - weight) + new_scores["testing"]       * weight, 1)
    competency.communication = round(competency.communication * (1 - weight) + new_scores["communication"] * weight, 1)
    competency.collaboration = round(competency.collaboration * (1 - weight) + new_scores["collaboration"] * weight, 1)
