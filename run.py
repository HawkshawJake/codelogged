# run.py
# Development server entry point.
# Run with: python run.py
# For production use a proper WSGI server (gunicorn, uvicorn, etc.).

import os
from app import create_app

config_name = os.environ.get("FLASK_ENV", "development")
app = create_app(config_name)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
