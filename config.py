# config.py
# Application configuration — loads settings from environment variables.
# Three configs: base, development, production.

import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration shared across all environments."""
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-in-prod")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

class DevelopmentConfig(Config):
    """Development config — uses local SQLite database."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///codelogged_dev.db"
    )

class ProductionConfig(Config):
    """Production config — expects a real DATABASE_URL env var."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///codelogged.db")

# Map string names to config classes for easy lookup in app factory
config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
