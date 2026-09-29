# NetLanding Development Guide

## Project Structure

```
NetLanding/
├── src/netlanding/       ← Python package (installable via pip)
│   ├── __init__.py
│   ├── __main__.py       ← CLI entry point (netlanding command)
│   ├── main.py           ← FastAPI app + static file serving
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── routers/
│   └── static/           ← compiled React build (output of npm run build)
├── frontend/             ← React/TypeScript/Vite source
├── pyproject.toml
└── docs/
```

> **`src/netlanding/static/`** is the compiled frontend (committed). A hash of the
> frontend sources is stored in `static/.frontend-hash`; when it no longer matches,
> the build is stale and is rebuilt automatically (see `src/netlanding/frontend_build.py`).

---

## Prerequisites

- **Python 3.11+**
- **Node 18+**

---

## Local Development (hot-reload, two terminals)

Run the backend and frontend as separate processes for the fastest iteration loop.

### Terminal 1 — Python API

```bash
git clone https://github.com/mhmdsamer-dev/NetLanding.git
cd NetLanding
pip install -e .
uvicorn netlanding.main:app --reload
```

`pip install -e .` reads all dependencies from `pyproject.toml` and installs the package in editable mode so import changes are reflected immediately without reinstalling.

- API server: `http://127.0.0.1:8000`
- Interactive docs: `http://127.0.0.1:8000/docs`
- SQLite database (`netlanding.db`) auto-creates in `~/.netlanding/` (or `$NETLANDING_DATA_DIR`) on first run; snapshots go in its `backups/` subfolder

### Terminal 2 — Vite dev server

```bash
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- All `/api/*` requests are automatically proxied to `http://127.0.0.1:8000`

---

## Building a Bundled Release

This produces a single Python package where the React UI is served directly by FastAPI — no separate Node process needed after install.

### 1. Build the frontend (automatic)

`uv build` / `python -m build` (via the `hatch_build.py` hook) and `netlanding` / `uv run netlanding`
inside a checkout check whether the frontend build is up to date and run `npm run build` if not
(needs Node 18+; a failed rebuild aborts a package build, but only warns when running the app).
To build manually:

```bash
cd frontend
npm install
npm run build
```

Vite outputs the compiled assets directly to `src/netlanding/static/` via `build.outDir: '../src/netlanding/static'` in `vite.config.ts`.

### 2. Build the Python package

```bash
# from the project root
pip install build # one-time installation 
python -m build
```

This produces `dist/netlanding-<version>-py3-none-any.whl` and a `.tar.gz` sdist, both containing the bundled frontend.

### 3. Verify locally (optional)

```bash
pip install dist/netlanding-*.whl
netlanding          # opens http://127.0.0.1:8000 in the browser
netlanding stop     # stop the server (PID tracked in ~/.netlanding/netlanding.pid)
netlanding backup | backups | export   # data safety (see src/netlanding/backup.py, export.py)
# flags: --port, --host, --no-browser, --log, --version
```

### 4. Release (GitHub + PyPI, automated)

1. Bump `version` in `pyproject.toml` and commit.
2. `git tag vX.Y.Z && git push origin main --tags`

`.github/workflows/release.yml` then checks the tag matches the version, runs the tests, verifies the
frontend build is up to date, builds the package, publishes to PyPI (Trusted Publishing) and creates
the GitHub release with the artifacts and generated notes. `ci.yml` runs the tests and the frontend
check on every push/PR.

One-time setup: add a trusted publisher on PyPI (repo `mhmdsamerdev/NetLanding`, workflow
`release.yml`, environment `pypi`) and create the `pypi` environment in the GitHub repo settings.

Manual fallback: `twine check dist/* && twine upload dist/*`.

---

## Adding / Changing API Routes

All backend logic lives exclusively in `src/netlanding/`:

| File | Purpose |
|---|---|
| `main.py` | FastAPI app, middleware, router registration, static file serving |
| `database.py` | SQLAlchemy engine, session factory |
| `models.py` | ORM models |
| `schemas.py` | Pydantic request/response schemas |
| `routers/` | One file per resource (`entries`, `sources`, `banks`, `settings`, `dashboard`, `data`) |
| `backup.py` | Snapshots via the sqlite3 backup API, integrity check, retention |
| `importer.py` | Import/restore: parse JSON export or SQLite snapshot, preview, merge/replace in one transaction |
| `export.py` | JSON (versioned, `format`/`version` fields) and CSV export |

Use **relative imports** throughout (`from .database import ...`, `from .. import models`).

---

## Contributing

Open an issue first to discuss what you'd like to change.

