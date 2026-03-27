# seed.py
# Creates one test user and three realistic seed tasks (one per character archetype).
# Run with: python seed.py
# Safe to re-run — skips creation if the test user already exists.

from datetime import datetime, timezone, timedelta
from app import create_app, db
from app.models import User, Task, CompetencyScore, CharacterType, TaskStatus

app = create_app("development")


def seed():
    with app.app_context():
        # ----------------------------------------------------------------
        # Test user
        # ----------------------------------------------------------------
        if User.query.filter_by(email="dev@codelogged.dev").first():
            print("Test user already exists — skipping seed.")
            return

        user = User(
            email="dev@codelogged.dev",
            username="devtest",
            language="Python",
            level=2,
            streak=3,
        )
        user.set_password("password123")

        # Seed competency scores so the profile page has something to show
        competency = CompetencyScore(
            user=user,
            delivery=72.0,
            code_quality=65.0,
            documentation=48.0,
            collaboration=80.0,
            testing=35.0,
            communication=70.0,
        )

        db.session.add(user)
        db.session.add(competency)
        db.session.flush()  # get user.id before creating tasks

        # ----------------------------------------------------------------
        # Seed tasks — inspired by the 50 most common junior dev issues
        # ----------------------------------------------------------------

        tasks = [
            # 1. Engineering Manager — off-by-one error in pagination
            Task(
                user_id=user.id,
                character=CharacterType.manager,
                subject="Pagination broken — users missing from last page",
                email_body=(
                    "Hi,\n\n"
                    "We've had a few complaints that the last page of user search results "
                    "is always empty. After some digging it looks like a classic off-by-one "
                    "issue in the pagination logic — the final page never quite renders.\n\n"
                    "The relevant function is paginate_results() in utils/pagination.py. "
                    "The total count is being calculated correctly, but the slice indices "
                    "look off. Can you fix it and write a quick test to confirm page "
                    "boundaries work?\n\n"
                    "Needs to be in by EOD — it's affecting a client demo tomorrow morning.\n\n"
                    "Thanks,\nSarah (Engineering Manager)"
                ),
                code_snippet=(
                    "def paginate_results(items, page, page_size):\n"
                    "    \"\"\"Return a slice of items for the given page number (1-indexed).\"\"\"\n"
                    "    start = page * page_size          # BUG: should be (page - 1) * page_size\n"
                    "    end = start + page_size\n"
                    "    return items[start:end]\n"
                ),
                status=TaskStatus.pending,
                deadline=datetime.now(timezone.utc) + timedelta(hours=8),
            ),

            # 2. QA Lead — missing null check causing 500 on profile page
            Task(
                user_id=user.id,
                character=CharacterType.qa,
                subject="500 error on /profile when user has no avatar set",
                email_body=(
                    "Hey,\n\n"
                    "Automated tests are catching a 500 on GET /api/profile/:username "
                    "whenever the user hasn't uploaded an avatar. It's trying to call "
                    ".url on a None value.\n\n"
                    "Steps to reproduce:\n"
                    "1. Register a new user without uploading an avatar\n"
                    "2. Visit their profile page\n"
                    "3. 500: AttributeError: 'NoneType' object has no attribute 'url'\n\n"
                    "The fix is straightforward — just add a null check in the serialiser "
                    "and return a default avatar URL if avatar is None. We have a default "
                    "at /static/avatars/default.png.\n\n"
                    "Cheers,\nMarco (QA)"
                ),
                code_snippet=(
                    "def to_dict(self):\n"
                    "    return {\n"
                    "        'id': self.id,\n"
                    "        'username': self.username,\n"
                    "        'avatar_url': self.avatar.url,  # crashes when avatar is None\n"
                    "    }\n"
                ),
                status=TaskStatus.pending,
                deadline=datetime.now(timezone.utc) + timedelta(hours=24),
            ),

            # 3. Product Manager — add character count to comment textarea
            Task(
                user_id=user.id,
                character=CharacterType.pm,
                subject="UX request: live character count on the comment box",
                email_body=(
                    "Hi team,\n\n"
                    "Small but high-impact UX improvement from our last user research session:\n\n"
                    "Users don't know there's a 280 character limit on comments until they "
                    "hit submit and get an error. We want to show a live character counter "
                    "below the textarea (e.g. '143 / 280') that turns red when they're "
                    "within 20 characters of the limit.\n\n"
                    "Acceptance criteria:\n"
                    "- Counter updates on every keystroke\n"
                    "- Grey text by default, red when ≥ 260 characters\n"
                    "- Counter reads '0 / 280' on page load\n"
                    "- No external libraries — vanilla JS or React state is fine\n\n"
                    "This is a quick win — shouldn't take more than an hour or two. "
                    "Happy to answer questions!\n\n"
                    "Thanks,\nPriya (Product)"
                ),
                code_snippet=(
                    "// Current comment form — no character counter yet\n"
                    "function CommentForm() {\n"
                    "  const [comment, setComment] = React.useState('');\n"
                    "  const MAX = 280;\n\n"
                    "  return (\n"
                    "    <div>\n"
                    "      <textarea\n"
                    "        value={comment}\n"
                    "        onChange={e => setComment(e.target.value)}\n"
                    "        maxLength={MAX}\n"
                    "      />\n"
                    "      {/* TODO: add character counter here */}\n"
                    "    </div>\n"
                    "  );\n"
                    "}\n"
                ),
                status=TaskStatus.pending,
                deadline=datetime.now(timezone.utc) + timedelta(hours=48),
            ),
        ]

        db.session.add_all(tasks)
        db.session.commit()

        print("Seed complete!")
        print(f"  User:  dev@codelogged.dev / password123")
        print(f"  Tasks: {len(tasks)} created")


if __name__ == "__main__":
    seed()
