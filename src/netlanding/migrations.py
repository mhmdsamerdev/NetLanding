"""Additive schema upgrades for existing databases (create_all never alters tables)."""
import logging

from sqlalchemy import inspect, text

from . import backup

log = logging.getLogger("netlanding")

# table -> [(column, SQL type)]; all nullable, so existing rows simply get NULL.
_ADDED_COLUMNS = {
    "sources": [("default_fee_percent", "FLOAT"), ("clearing_days", "INTEGER")],
}


def _missing(engine) -> dict[str, list[tuple[str, str]]]:
    insp = inspect(engine)
    out = {}
    for table, cols in _ADDED_COLUMNS.items():
        if not insp.has_table(table):
            continue
        have = {c["name"] for c in insp.get_columns(table)}
        todo = [c for c in cols if c[0] not in have]
        if todo:
            out[table] = todo
    return out


def migrate(engine) -> None:
    """Add any missing columns. Idempotent; snapshots the DB first when there is something to change."""
    todo = _missing(engine)
    if not todo:
        return
    try:
        backup.create_snapshot("premigrate")
    except Exception:  # noqa: BLE001 - a failed safety copy must not block startup
        log.exception("pre-migration snapshot failed")
    with engine.begin() as conn:
        for table, cols in todo.items():
            for name, sql_type in cols:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
