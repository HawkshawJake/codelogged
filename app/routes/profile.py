# app/routes/profile.py
# Profile routes: public user profile and current user's competency scores.
# Public profile includes recent activity for the profile page.

from flask import Blueprint, jsonify
from flask_login import login_required, current_user

from app.models import User, Task, TaskStatus

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@profile_bp.route("/<username>", methods=["GET"])
def public_profile(username: str):
    """Return a user's public profile. No authentication required.

    Includes: username, level, streak, tasks_completed, competency scores,
    and the last 10 completed tasks for the activity feed.
    """
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    completed_statuses = [TaskStatus.submitted, TaskStatus.reviewed]

    tasks_completed = Task.query.filter(
        Task.user_id == user.id,
        Task.status.in_(completed_statuses),
    ).count()

    # Last 10 completed tasks for the activity feed
    recent_tasks = (
        Task.query
        .filter(
            Task.user_id == user.id,
            Task.status.in_(completed_statuses),
        )
        .order_by(Task.submitted_at.desc())
        .limit(10)
        .all()
    )

    return jsonify({
        "username": user.username,
        "level": user.level,
        "streak": user.streak,
        "language": user.language,
        "tasks_completed": tasks_completed,
        "member_since": user.created_at.isoformat(),
        "competency": user.competency.to_dict() if user.competency else None,
        "recent_tasks": [
            {
                "id": t.id,
                "character": t.character.value,
                "subject": t.subject,
                "status": t.status.value,
                "submitted_at": t.submitted_at.isoformat() if t.submitted_at else None,
                "deadline": t.deadline.isoformat() if t.deadline else None,
                "created_at": t.created_at.isoformat(),
            }
            for t in recent_tasks
        ],
    }), 200


@profile_bp.route("/me/scores", methods=["GET"])
@login_required
def my_scores():
    """Return the current user's competency scores."""
    if not current_user.competency:
        return jsonify({"error": "No scores yet"}), 404
    return jsonify(current_user.competency.to_dict()), 200
