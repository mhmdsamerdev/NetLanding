# Development

Needs [uv](https://docs.astral.sh/uv/) and Node 18+.

## Setup

```bash
git clone https://github.com/mhmdsamerdev/NetLanding.git
cd NetLanding
uv sync --extra dev
```

## Run

```bash
uv run netlanding
```

This is the recommended way. It serves the app on :8000 and rebuilds the frontend first if it's stale. Add `--log` for debug output, `--no-browser` to skip opening the browser.

For hot reload while editing, use two terminals instead:

```bash
uv run uvicorn netlanding.main:app --reload   # API on :8000 (docs at /docs)
cd frontend && npm install && npm run dev     # UI on :5173, proxies /api to :8000
```

Data lives in `~/.netlanding/` (or `$NETLANDING_DATA_DIR`). Point it at a temp folder while developing so you don't touch real data.

## Test

```bash
uv run pytest
```

## Layout

```
netlanding/
├── src/netlanding/
│   ├── __main__.py         CLI (start, stop, backup, export)
│   ├── main.py             FastAPI app, serves the UI
│   ├── models.py           database tables
│   ├── schemas.py          request/response shapes
│   ├── routers/            one file per resource (entries, sources, banks...)
│   ├── backup.py           snapshots
│   ├── export.py           JSON / CSV export
│   ├── importer.py         import and restore
│   └── static/             built frontend (committed, never edit)
├── frontend/src/
│   ├── pages/              Dashboard, Entries, Settings
│   ├── components/         shared UI, dashboard charts
│   └── lib/                API client, helpers
├── tests/
└── docs/
```

Use relative imports in the backend.

## Frontend build

Vite builds into `static/`. A hash of the frontend sources in `static/.frontend-hash` tells if it's stale. Stale builds are rebuilt automatically on `uv run netlanding` and `uv build`. To build by hand:

```bash
cd frontend && npm run build
```

CI fails if you commit frontend changes without the rebuilt `static/`.

## Release

1. Set `version` in `pyproject.toml`.
2. In `CHANGELOG.md`, move `[Unreleased]` entries under `## vX.Y.Z - YYYY-MM-DD`.
3. Commit, then `git tag vX.Y.Z && git push origin main --tags`.

GitHub Actions does the rest: tests, build, PyPI publish, and a GitHub release using the changelog section as notes.
