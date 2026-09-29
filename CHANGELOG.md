# Changelog

All notable changes to NetLanding. Release notes on GitHub are taken from the matching `## vX.Y.Z` section.

## [Unreleased]


- Tagging `vX.Y.Z` runs tests, checks the frontend build, publishes to PyPI and creates the GitHub release (GitHub Actions).
- The frontend build is checked (content hash) and rebuilt when stale on `netlanding` start from a checkout and on every `uv build`/`python -m build`.
- Income sources can store a usual fee (%) and days to clear.
- Automatic database snapshots and JSON/CSV export (Settings, CLI).
- Import and restore from the UI: preview, merge or replace, with an automatic safety snapshot and Undo.
- Cleaner CLI: quiet output with `--log` for debugging, opens the browser, detects an already-running server, and adds `netlanding stop`.
- Custom dropdowns, date picker with fast typing, and amount inputs replace native browser controls.
- Redesigned dashboard (month navigation, money-flow chart, timeline, withdraw list) with a new app-wide theme.
- New project icon replaces the temporary favicon and logo (SVG, ICO, PNG, web manifest).

## v0.1.1 - 2026-06-02

- Fixed: the database is now stored in `~/.netlanding/` (or `$NETLANDING_DATA_DIR`) instead of the current working directory, so your data no longer depends on where you launch `netlanding` from.

## v0.1.0 - 2026-05-02

Initial public release.

- Dashboard with the income pipeline (Pending, Available, Withdrawn, In Bank), fee tracking, per-source breakdown, average days to clear and an expiry warning.
- Entries table with search, filters, sorting, inline edit and delete, and pagination.
- Entry modal with live net income calculation and status-driven fields.
- Settings for income sources, bank accounts and base display currency.
- Local SQLite storage; the React UI is bundled and served by FastAPI, installable with `pip install netlanding`.
