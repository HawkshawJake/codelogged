# app/routes/auth.py
# Authentication routes: register, login, logout, and /me.
# Uses Flask-Login for session management and bcrypt for password hashing.

from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user

from app import db
from app.models import User, CompetencyScore

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Create a new user account.

    Expects JSON: { email, username, password, language? }
    Returns the new user object on success.
    """
    data = request.get_json()

    # Basic input validation
    required = ["email", "username", "password"]
    for field in required:
        if not data or not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already taken"}), 409

    user = User(
        email=data["email"],
        username=data["username"],
        language=data.get("language", "Python"),
    )
    user.set_password(data["password"])

    # Create an empty competency score record for this user
    competency = CompetencyScore(user=user)

    db.session.add(user)
    db.session.add(competency)
    db.session.commit()

    login_user(user)
    return jsonify(user.to_dict()), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate an existing user and start a session.

    Expects JSON: { email, password }
    """
    data = request.get_json()

    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=data["email"]).first()

    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    login_user(user, remember=True)
    return jsonify(user.to_dict()), 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """End the current session."""
    logout_user()
    return jsonify({"message": "Logged out"}), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    """Return the currently authenticated user's data."""
    return jsonify(current_user.to_dict()), 200
