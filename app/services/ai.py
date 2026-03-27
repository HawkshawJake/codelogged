# app/services/ai.py
# Anthropic API integration: task generation and solution feedback.
#
# Both functions degrade gracefully — if no API key is set or the call fails,
# generate_task() returns None (caller falls back to seed templates) and
# get_ai_feedback() returns stub text with no scores (no DB update occurs).
#
# Set ANTHROPIC_API_KEY in .env to enable real calls.
# Set ANTHROPIC_MODEL to override the default model (default: claude-sonnet-4-6).

import os
import re
import json

import anthropic

# Model used for all API calls — override with ANTHROPIC_MODEL in .env
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")

# Stub feedback returned when no API key is present or an error occurs.
# Note: no score line in the stub, so no DB update happens — keeps behaviour honest.
STUB_FEEDBACK = """**Code Review**

Good attempt! Here are a few observations:

**What you did well:**
- The logic addresses the core issue described in the brief
- Code is readable with sensible variable names

**Areas to improve:**
- Consider adding input validation at the top of the function
- A brief inline comment explaining *why* this approach was chosen would help future maintainers
- Think about edge cases: what happens if the input is empty or null?

**Overall:** Solid first pass. Tighten up the edge case handling and add a test or two and this is ready to ship.

*(Add your Anthropic API key to .env to receive scored feedback and update your competency profile.)*
"""

# Character personas fed directly into the generation prompt.
_CHAR_PERSONAS = {
    "manager": (
        "Sarah Chen, Engineering Manager. "
        "Focused on delivery, timelines, and business impact. "
        "Direct and supportive tone, signs off as 'Sarah'."
    ),
    "qa": (
        "Marco Rossi, QA Lead. "
        "Detail-oriented, writes precise bug reports with exact reproduction steps. "
        "Professional and measured tone, signs off as 'Marco (QA)'."
    ),
    "pm": (
        "Priya Patel, Product Manager. "
        "User-focused, writes clear acceptance criteria, collaborative tone. "
        "Signs off as 'Priya (Product)'."
    ),
}

_LEVEL_CONTEXT = {
    1: "trivially simple — obvious bugs, missing return values, straightforward typos in logic",
    2: "simple — off-by-one errors, null/None not handled, basic validation missing, small feature additions",
    3: "moderate — refactoring messy code, performance issues, implementing features with edge cases",
    4: "complex — security vulnerabilities, race conditions, API design decisions",
}


# ---------------------------------------------------------------------------
# Task generation
# ---------------------------------------------------------------------------

def generate_task(language: str, level: int, character: str) -> dict | None:
    """Generate a realistic work task email using the Anthropic API.

    Args:
        language:  The user's preferred programming language (e.g. "Python").
        level:     The user's current level (1–4).
        character: Which character sends the email: "manager", "qa", or "pm".

    Returns:
        A dict with keys: subject, email_body, code_snippet.
        Returns None on error or if no API key is configured — the caller
        should fall back to a seed template.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None

    char_desc = _CHAR_PERSONAS.get(character, _CHAR_PERSONAS["manager"])
    difficulty = _LEVEL_CONTEXT.get(level, _LEVEL_CONTEXT[2])

    prompt = f"""You are generating a realistic work task email for a developer training platform.

The email is from: {char_desc}
Developer's language: {language}
Developer level {level} — tasks should be {difficulty}

Return ONLY a valid JSON object with exactly these three fields:
{{
  "subject": "concise professional email subject line",
  "email_body": "the full email body, written in first person as the character",
  "code_snippet": "{language} code for the task (10–20 lines)"
}}

Rules:
- Write the email body naturally — like a real colleague, not a tutorial exercise
- Embed [[CODE_SNIPPET]] in the email body at the point where the character references the code
- The code snippet must be in {language} and contain a realistic bug to fix or feature stub to implement
- The task should be solvable in 20–40 minutes by a level {level} developer
- Make the bug non-obvious but findable with careful reading
- Email body: 2–4 short paragraphs, no bullet-point lists of requirements unless it's a PM task
- Return nothing outside the JSON — no markdown fences, no explanation"""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()

        # Strip markdown fences if the model wrapped the output
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
        raw = raw.strip()

        data = json.loads(raw)

        if not all(k in data for k in ("subject", "email_body", "code_snippet")):
            print("[AI] generate_task: missing required fields in response")
            return None

        return data

    except json.JSONDecodeError as e:
        print(f"[AI] generate_task: JSON parse error — {e}")
        return None
    except Exception as e:
        print(f"[AI] generate_task: error — {e}")
        return None


# ---------------------------------------------------------------------------
# Solution feedback
# ---------------------------------------------------------------------------

def get_ai_feedback(
    task_description: str,
    code_snippet: str | None,
    solution_code: str,
) -> dict:
    """Review a submitted solution and return feedback text plus parsed scores.

    Returns a dict:
        {
            "text":   str,          # markdown feedback
            "scores": dict | None,  # parsed score dict, or None if unavailable
        }

    scores dict keys: delivery, code_quality, documentation,
                      testing, communication, collaboration  (all floats 0–100)

    When no API key is set or the call fails, returns stub text with scores=None
    so the caller knows not to update the database.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"text": STUB_FEEDBACK, "scores": None}

    prompt = f"""You are a senior engineer giving code review feedback to a junior developer.
Be honest, specific, and constructive. Focus on what would make this production-ready.

Original task brief:
{task_description}

Starter code (if any):
{code_snippet or "None provided"}

Developer's submitted solution:
{solution_code}

Write 3–4 paragraphs covering:
1. Whether the solution correctly fixes the bug or implements the feature
2. Code quality — naming, clarity, structure
3. What's missing: error handling, edge cases, tests, comments
4. One specific thing they did well

Then end with EXACTLY this line — fill in integer scores from 0 to 100:
*Delivery: X | Code Quality: X | Documentation: X | Testing: X | Communication: X | Collaboration: X*

Scoring guide:
- 0–39: Incomplete or broken
- 40–59: Works but rough — missing error handling, no comments, no tests
- 60–74: Solid — handles main case, somewhat readable
- 75–89: Good — edge cases handled, readable, some comments
- 90–100: Excellent — thorough, tested, clean, could ship as-is

Be calibrated. A basic working solution with no tests or comments: 45–60. Reserve 85+ for genuinely impressive work."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text
        scores = _parse_scores(text)
        return {"text": text, "scores": scores}

    except Exception as e:
        print(f"[AI] get_ai_feedback: error — {e}")
        return {"text": STUB_FEEDBACK, "scores": None}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_scores(feedback_text: str) -> dict | None:
    """Extract the six competency scores from the last line of feedback.

    Looks for: *Delivery: X | Code Quality: X | ... | Collaboration: X*
    Returns None if the line is not found or can't be parsed.
    """
    pattern = (
        r"\*Delivery:\s*(\d+)\s*\|"
        r"\s*Code Quality:\s*(\d+)\s*\|"
        r"\s*Documentation:\s*(\d+)\s*\|"
        r"\s*Testing:\s*(\d+)\s*\|"
        r"\s*Communication:\s*(\d+)\s*\|"
        r"\s*Collaboration:\s*(\d+)\*"
    )
    match = re.search(pattern, feedback_text, re.IGNORECASE)
    if not match:
        return None

    return {
        "delivery":      float(match.group(1)),
        "code_quality":  float(match.group(2)),
        "documentation": float(match.group(3)),
        "testing":       float(match.group(4)),
        "communication": float(match.group(5)),
        "collaboration": float(match.group(6)),
    }
