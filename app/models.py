# app/models.py
# SQLAlchemy ORM models for all database tables.
# Also wires up Flask-Login's user loader so sessions work correctly.

import enum
from datetime import datetime, timezone

from flask_login import UserMixin

from app import db, login_manager, bcrypt


# ---------------------------------------------------------------------------
# Flask-Login user loader — called on every authenticated request
# ---------------------------------------------------------------------------

@login_manager.user_loader
def load_user(user_id: str):
    return User.query.get(int(user_id))


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class TaskStatus(enum.Enum):
    pending = "pending"
    submitted = "submitted"
    reviewed = "reviewed"


class CharacterType(enum.Enum):
    manager = "manager"
    qa = "qa"
    pm = "pm"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(UserMixin, db.Model):
    """Registered developer user."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    language = db.Column(db.String(50), default="Python")  # preferred coding language
    level = db.Column(db.Integer, default=1)
    streak = db.Column(db.Integer, default=0)  # consecutive days with a submission
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    tasks = db.relationship("Task", backref="user", lazy=True)
    submissions = db.relationship("Submission", backref="user", lazy=True)
    competency = db.relationship(
        "CompetencyScore", backref="user", uselist=False, lazy=True
    )

    def set_password(self, password: str):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "language": self.language,
            "level": self.level,
            "streak": self.streak,
            "created_at": self.created_at.isoformat(),
        }


class Task(db.Model):
    """A simulated work task delivered to a user's inbox."""
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Who sent this task (simulated colleague)
    character = db.Column(db.Enum(CharacterType), nullable=False)

    subject = db.Column(db.String(255), nullable=False)
    email_body = db.Column(db.Text, nullable=False)
    code_snippet = db.Column(db.Text, nullable=True)  # optional starter code

    status = db.Column(db.Enum(TaskStatus), default=TaskStatus.pending, nullable=False)
    deadline = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    submitted_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    submissions = db.relationship("Submission", backref="task", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "character": self.character.value,
            "subject": self.subject,
            "email_body": self.email_body,
            "code_snippet": self.code_snippet,
            "status": self.status.value,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "created_at": self.created_at.isoformat(),
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
        }


class Submission(db.Model):
    """A user's code submission for a task, with AI feedback attached."""
    __tablename__ = "submissions"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    solution_code = db.Column(db.Text, nullable=False)
    ai_feedback = db.Column(db.Text, nullable=True)   # populated after AI review
    thumbs_up = db.Column(db.Boolean, nullable=True)  # user rates the feedback

    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "user_id": self.user_id,
            "solution_code": self.solution_code,
            "ai_feedback": self.ai_feedback,
            "thumbs_up": self.thumbs_up,
            "submitted_at": self.submitted_at.isoformat(),
        }


class CompetencyScore(db.Model):
    """Running competency profile for a user across six dimensions (0.0–100.0)."""
    __tablename__ = "competency_scores"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    delivery = db.Column(db.Float, default=0.0)       # ships on time
    code_quality = db.Column(db.Float, default=0.0)   # clean, correct code
    documentation = db.Column(db.Float, default=0.0)  # comments, docstrings
    collaboration = db.Column(db.Float, default=0.0)  # follows brief, asks good questions
    testing = db.Column(db.Float, default=0.0)        # includes tests
    communication = db.Column(db.Float, default=0.0)  # clear responses

    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "delivery": self.delivery,
            "code_quality": self.code_quality,
            "documentation": self.documentation,
            "collaboration": self.collaboration,
            "testing": self.testing,
            "communication": self.communication,
            "updated_at": self.updated_at.isoformat(),
        }
