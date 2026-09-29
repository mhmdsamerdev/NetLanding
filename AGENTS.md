# AGENTS.md

**Editing this file: KEEP IT SHORT. No logs, no diff notes, no change history. It only tells a new AI session how I work and what this project is and its key architecture. Don't update it unless I ask.**

## Project
NetLanding: locally hosted income tracker for freelancers. Tracks gross income and pre-bank deductions (platform/withdrawal fees) only. NOT an expense tracker.
Status lifecycle: Pending → Available → Withdrawn → In Bank.

## Architecture
- `src/netlanding/`: FastAPI + SQLAlchemy + SQLite. `routers/` per resource, `models.py`, `schemas.py`, `migrations.py`, plus `backup.py`, `export.py`, `importer.py`. CLI in `__main__.py`.
- `frontend/`: React + TypeScript + Vite. Built output is committed in `src/netlanding/static/` and served by FastAPI. Stale builds (content hash in `static/.frontend-hash`) auto-rebuild; never hand-edit static files.
- Data lives in `~/.netlanding/` (or `$NETLANDING_DATA_DIR`), never in the cwd.
- Details: `docs/development.md`.

## How to work
- Don't guess. Investigate and debug thoroughly first. Fix only when sure; if not sure, ask.
- Match the surrounding code's style and idioms.
- Run tests (`tests/`) and check the frontend build before calling something done.

## Code comments
- Short, clear, focused; explain only the code they sit on. No diff/change notes ("added", "now", "was").
- If you meet an existing comment that breaks this, fix it without asking.

## Git
- After any change, suggest a commit message.
- Only commit when asked. Messages short, focused, conventional-style (`feat:`, `fix:`, `docs:`), never mention AI or add co-author lines.
- NEVER `git tag`. Tags trigger GitHub/PyPI releases; the user does that manually.

## CHANGELOG.md
Every user-visible change gets one very short bullet under `## [Unreleased]`.
