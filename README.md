# Codelogged

**The work experience you never got.**

Codelogged is a developer simulation platform where users receive daily coding tasks through a simulated work inbox, submit solutions, get AI-powered feedback, and build a tracked competency profile they can share with employers.

---

## Tech stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | Flask (Python), SQLAlchemy, SQLite  |
| Auth       | Flask-Login + bcrypt                |
| AI         | Anthropic API (`claude-sonnet-4-20250514`) |
| Frontend   | React + Vite + Tailwind CSS v4      |
| Routing    | React Router v6                     |

---

## Local setup

### Prerequisites

- Python 3.11+
- Node 18+
- npm 9+

### 1. Clone and enter the repo

```bash
git clone <your-repo-url> codelogged
cd codelogged
```

### 2. Backend

```bash
# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env — set FLASK_SECRET_KEY at minimum

# Seed the database with a test user and three tasks
python seed.py

# Start the Flask dev server (port 5000)
python run.py
```

**Test credentials:** `dev@codelogged.dev` / `password123`

### 3. Frontend

```bash
cd client
npm install
npm run dev      # starts Vite on http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to Flask on port 5000, so no CORS config needed during development.

### 4. (Optional) Enable real AI feedback

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Set `ANTHROPIC_API_KEY=sk-ant-...` in your `.env`
3. In `app/services/ai.py`, uncomment the live Anthropic client block

Without a key the app runs fine — it returns hardcoded stub feedback.

---

## Project structure

```
codelogged/
├── app/
│   ├── __init__.py         # Flask app factory
│   ├── models.py           # SQLAlchemy models
│   ├── routes/
│   │   ├── auth.py         # /api/auth/*
│   │   ├── tasks.py        # /api/tasks/*
│   │   └── profile.py      # /api/profile/*
│   └── services/
│       └── ai.py           # Anthropic API wrapper (stubbed)
├── client/
│   └── src/
│       ├── pages/          # Login, Register, Dashboard, Task, Profile
│       ├── components/     # Inbox, CompetencyBars, CodeBlock
│       └── App.jsx         # Router + auth context
├── seed.py                 # Creates test user + 3 seed tasks
├── config.py               # Flask configuration classes
├── run.py                  # Dev server entry point
└── requirements.txt
```

---

## API reference

| Method | Path                        | Auth | Description                    |
|--------|-----------------------------|------|--------------------------------|
| POST   | /api/auth/register          | —    | Create account                 |
| POST   | /api/auth/login             | —    | Login                          |
| POST   | /api/auth/logout            | ✓    | Logout                         |
| GET    | /api/auth/me                | ✓    | Current user                   |
| GET    | /api/tasks                  | ✓    | List all user tasks            |
| GET    | /api/tasks/:id              | ✓    | Get single task                |
| POST   | /api/tasks/generate         | ✓    | Generate new task              |
| POST   | /api/tasks/:id/submit       | ✓    | Submit solution                |
| GET    | /api/profile/:username      | —    | Public profile                 |
| GET    | /api/profile/me/scores      | ✓    | Current user's competency scores |

---

## What's coming next

- [ ] Real AI task generation with personalised difficulty and language targeting
- [ ] Competency score calculation from AI feedback scores
- [ ] Daily task scheduler with streak tracking
- [ ] Employer-facing profile share links
- [ ] Leaderboard / community view
- [ ] Syntax-highlighted code editor (Monaco or CodeMirror)
- [ ] Task categories (bug fix, feature, refactor, code review)
- [ ] Email-style reply thread between user and AI character
