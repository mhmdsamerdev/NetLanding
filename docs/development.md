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

> **`src/netlanding/static/`** is populated by the frontend build step.  
> The `.gitkeep` placeholder keeps the directory tracked in git while  
> built assets (populated at release time) are not committed.

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
- SQLite database (`netlanding.db`) auto-creates in the working directory on first run

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

### 1. Build the frontend

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
netlanding
# open http://127.0.0.1:8000
```

### 4. Upload to PyPI

```bash
pip install twine # one-time installation
twine check dist/*
twine upload dist/*
```

---

## Adding / Changing API Routes

All backend logic lives exclusively in `src/netlanding/`:

| File | Purpose |
|---|---|
| `main.py` | FastAPI app, middleware, router registration, static file serving |
| `database.py` | SQLAlchemy engine, session factory |
| `models.py` | ORM models |
| `schemas.py` | Pydantic request/response schemas |
| `routers/` | One file per resource (`entries`, `sources`, `banks`, `settings`, `dashboard`) |

Use **relative imports** throughout (`from .database import ...`, `from .. import models`).

---

## Contributing

Open an issue first to discuss what you'd like to change.

