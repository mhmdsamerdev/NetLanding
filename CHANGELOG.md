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
