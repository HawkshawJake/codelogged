# app/__init__.py
# Flask application factory.
# Creates and configures the Flask app, initialises extensions,
# and registers all route blueprints.

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS

from config import config_map

# Initialise extensions without binding to an app yet (app factory pattern)
db = SQLAlchemy()
login_manager = LoginManager()
bcrypt = Bcrypt()


def create_app(config_name: str = "default") -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_map[config_name])

    # Allow React dev server (port 5173) to talk to the API
    CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

    # Bind extensions to this app instance
    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"  # redirect target for @login_required

    # Register route blueprints
    from app.routes.auth import auth_bp
    from app.routes.tasks import tasks_bp
    from app.routes.profile import profile_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(profile_bp)

    # Create all tables on first run
    with app.app_context():
        db.create_all()

    return app
