"""Automatic SQLite snapshots ("archives") with retention."""
import re
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from .database import DATA_DIR, engine

KEEP_ALL_DAYS = 7      # keep every snapshot newer than this
KEEP_DAILY_DAYS = 30   # then newest per day up to this age
                       # beyond that: newest per month
INTERVAL = timedelta(hours=24)

_NAME_RE = re.compile(r"^netlanding-\d{8}-\d{6}(-[a-z]+)?\.db$")


def backups_dir() -> Path:
    path = DATA_DIR / "backups"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _db_path() -> Path | None:
    if engine.url.get_backend_name() != "sqlite":
        return None
    database = engine.url.database
    if not database or database == ":memory:":
        return None
    return Path(database)


def is_valid_name(name: str) -> bool:
    return bool(_NAME_RE.match(name))


def create_snapshot(reason: str = "") -> Path:
    """Consistent copy of the live DB (sqlite backup API), verified before it is kept."""
    src_path = _db_path()
    if src_path is None or not src_path.exists():
        raise RuntimeError("no file-based SQLite database to back up")
    suffix = f"-{reason}" if reason else ""
    dest = backups_dir() / f"netlanding-{datetime.now():%Y%m%d-%H%M%S}{suffix}.db"
    tmp = dest.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)

    src = sqlite3.connect(src_path)
    dst = sqlite3.connect(tmp)
    try:
        src.backup(dst)
        result = dst.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        dst.close()
        src.close()
    if result != "ok":
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"snapshot failed integrity check: {result}")
    tmp.replace(dest)
    return dest


def list_snapshots() -> list[dict]:
    items = []
    for p in backups_dir().iterdir():
        if p.is_file() and is_valid_name(p.name):
            st = p.stat()
            items.append({
                "name": p.name,
                "size": st.st_size,
                "created_at": datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
            })
    return sorted(items, key=lambda i: i["name"], reverse=True)


def prune(now: datetime | None = None) -> list[str]:
    """Apply retention; the newest snapshot is never deleted. Returns removed names."""
    now = now or datetime.now()
    snaps = list_snapshots()  # newest first
    seen: set[str] = set()
    removed = []
    for i, s in enumerate(snaps):
        ts = datetime.fromisoformat(s["created_at"])
        age = now - ts
        if i == 0 or age <= timedelta(days=KEEP_ALL_DAYS):
            continue
        key = f"{ts:%Y-%m-%d}" if age <= timedelta(days=KEEP_DAILY_DAYS) else f"{ts:%Y-%m}"
        if key in seen:
            (backups_dir() / s["name"]).unlink(missing_ok=True)
            removed.append(s["name"])
        else:
            seen.add(key)
    return removed


def snapshot_if_due() -> Path | None:
    snaps = list_snapshots()
    if snaps:
        last = datetime.fromisoformat(snaps[0]["created_at"])
        if datetime.now() - last < INTERVAL:
            return None
    path = create_snapshot("auto")
    prune()
    return path
