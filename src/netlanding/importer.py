"""Import/restore from a JSON export or a SQLite snapshot (preview, then merge or replace)."""
import json
import os
import secrets
import sqlite3
import tempfile
import time
from collections import Counter
from datetime import date, datetime

from sqlalchemy.orm import Session

from . import backup, models
from .export import EXPORT_FORMAT, EXPORT_VERSION

MAX_BYTES = 100 * 1024 * 1024
TOKEN_TTL = 15 * 60

_TABLES = {
    "settings": models.Settings,
    "sources": models.Source,
    "bank_accounts": models.BankAccount,
    "entries": models.Entry,
}
_SQLITE_HEADER = b"SQLite format 3\x00"

_staged: dict[str, tuple[float, dict]] = {}


class ImportError_(ValueError):
    """User-facing problem with the file being imported."""


# ── Loading ─────────────────────────────────────────────────────────────────
def _from_json(raw: bytes) -> dict:
    try:
        data = json.loads(raw.decode("utf-8-sig"))
    except (UnicodeDecodeError, ValueError):
        raise ImportError_("This file is not valid JSON or a NetLanding database.")
    if not isinstance(data, dict) or data.get("format") != EXPORT_FORMAT:
        raise ImportError_("This JSON file is not a NetLanding export.")
    if not isinstance(data.get("version"), int) or data["version"] > EXPORT_VERSION:
        raise ImportError_(
            f"This export was made by a newer NetLanding (format v{data.get('version')}). "
            "Update NetLanding and try again."
        )
    for key in _TABLES:
        if not isinstance(data.get(key, []), list):
            raise ImportError_(f"Malformed export: '{key}' should be a list.")
        data.setdefault(key, [])
    data["kind"] = "json"
    return data


def _from_sqlite_path(path: str) -> dict:
    try:
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        con.row_factory = sqlite3.Row
        tables = {r[0] for r in con.execute("select name from sqlite_master where type='table'")}
        if "entries" not in tables:
            raise ImportError_("This database has no NetLanding entries table.")
        data = {"kind": "sqlite", "exported_at": None, "app_version": None}
        for key, model in _TABLES.items():
            data[key] = []
            if key not in tables:
                continue
            have = {r[1] for r in con.execute(f"pragma table_info({key})")}
            cols = [c.name for c in model.__table__.columns if c.name in have]
            for row in con.execute(f"select {', '.join(cols)} from {key}"):
                data[key].append({c: row[c] for c in cols})
        con.close()
        return data
    except sqlite3.DatabaseError:
        raise ImportError_("This file is not a valid NetLanding database.")


def load_upload(raw: bytes) -> dict:
    if not raw:
        raise ImportError_("The file is empty.")
    if raw.startswith(_SQLITE_HEADER):
        fd, tmp = tempfile.mkstemp(suffix=".db")
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(raw)
            return _from_sqlite_path(tmp)
        finally:
            os.unlink(tmp)
    return _from_json(raw)


def load_snapshot(name: str) -> dict:
    path = backup.backups_dir() / name
    if not backup.is_valid_name(name) or not path.is_file():
        raise ImportError_("Backup not found.")
    data = _from_sqlite_path(str(path))
    data["exported_at"] = datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec="seconds")
    return data


# ── Staging (single-user local app: in-memory is enough) ────────────────────
def stage(data: dict) -> str:
    now = time.time()
    for t in [t for t, (ts, _) in _staged.items() if now - ts > TOKEN_TTL]:
        del _staged[t]
    token = secrets.token_urlsafe(16)
    _staged[token] = (now, data)
    return token


def staged(token: str) -> dict:
    item = _staged.get(token)
    if not item or time.time() - item[0] > TOKEN_TTL:
        raise ImportError_("This import expired. Choose the file again.")
    return item[1]


# ── Helpers ─────────────────────────────────────────────────────────────────
def _entry_key(e: dict, source_name: str | None) -> tuple:
    return (
        (e.get("project_client_name") or "").strip().lower(),
        round(float(e.get("gross_amount") or 0), 2),
        e.get("gross_currency"),
        str(e.get("date_received") or ""),
        (e.get("invoice_ref") or "").strip(),
        (source_name or "").strip().lower(),
    )


def _names(rows: list[dict]) -> dict:
    return {r["id"]: r.get("name") for r in rows}


def _count(db: Session) -> dict:
    return {
        "entries": db.query(models.Entry).count(),
        "sources": db.query(models.Source).count(),
        "bank_accounts": db.query(models.BankAccount).count(),
    }


def _existing_keys(db: Session) -> Counter:
    keys = Counter()
    for e in db.query(models.Entry):
        keys[_entry_key(
            {"project_client_name": e.project_client_name, "gross_amount": e.gross_amount,
             "gross_currency": e.gross_currency,
             "date_received": e.date_received.isoformat() if e.date_received else "",
             "invoice_ref": e.invoice_ref},
            e.source.name if e.source else None,
        )] += 1
    return keys


def _split_new(data: dict, db: Session) -> tuple[list[dict], int]:
    """Entries not already present (multiset-aware) and the count of duplicates."""
    existing = _existing_keys(db)
    src = _names(data["sources"])
    new, dup = [], 0
    for e in data["entries"]:
        k = _entry_key(e, src.get(e.get("source_id")))
        if existing[k] > 0:
            existing[k] -= 1
            dup += 1
        else:
            new.append(e)
    return new, dup


def validate(data: dict) -> None:
    """Reject the whole file up front if any row is unusable."""
    for row in data["sources"] + data["bank_accounts"]:
        if not isinstance(row.get("id"), int) or not (row.get("name") or "").strip():
            raise ImportError_("A source or bank account in this file has no name. Nothing was imported.")
    for e in data["entries"]:
        _make_entry(e, None, None, keep_id=False)


def preview(data: dict, db: Session) -> dict:
    validate(data)
    dates = sorted(str(e["date_received"]) for e in data["entries"] if e.get("date_received"))
    new, dup = _split_new(data, db)
    return {
        "kind": data["kind"],
        "exported_at": data.get("exported_at"),
        "app_version": data.get("app_version"),
        "file": {
            "entries": len(data["entries"]),
            "sources": len(data["sources"]),
            "bank_accounts": len(data["bank_accounts"]),
            "first_date": dates[0] if dates else None,
            "last_date": dates[-1] if dates else None,
        },
        "current": _count(db),
        "merge": {"new": len(new), "duplicates": dup},
    }


# ── Applying ────────────────────────────────────────────────────────────────
def _d(v):
    return date.fromisoformat(str(v)[:10]) if v else None


def _dt(v):
    return datetime.fromisoformat(str(v)) if v else None


def _make_entry(e: dict, source_id, bank_id, keep_id: bool) -> models.Entry:
    try:
        amount = float(e["gross_amount"])
        name = e["project_client_name"]
        if not name:
            raise KeyError("project_client_name")
        obj = models.Entry(
            project_client_name=name,
            gross_amount=amount,
            gross_currency=e.get("gross_currency") or "USD",
            platform_fee=float(e.get("platform_fee") or 0),
            withdrawal_fee=float(e.get("withdrawal_fee") or 0),
            source_id=source_id,
            bank_account_id=bank_id,
            status=e.get("status") or "Pending",
            date_received=_d(e.get("date_received")),
            date_available=_d(e.get("date_available")),
            date_expiry=_d(e.get("date_expiry")),
            current_location=e.get("current_location"),
            date_withdrawn=_d(e.get("date_withdrawn")),
            date_cleared=_d(e.get("date_cleared")),
            invoice_ref=e.get("invoice_ref"),
            notes=e.get("notes"),
            created_at=_dt(e.get("created_at")) or datetime.now(),
            updated_at=_dt(e.get("updated_at")) or datetime.now(),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ImportError_(f"Entry #{e.get('id', '?')} is invalid ({exc}). Nothing was imported.")
    if keep_id:
        obj.id = e.get("id")
    return obj


def apply(data: dict, mode: str, db: Session) -> dict:
    if mode not in ("merge", "replace"):
        raise ImportError_("Unknown import mode.")
    try:
        safety = backup.create_snapshot("preimport").name
    except RuntimeError:
        safety = None  # e.g. empty/new DB file; nothing to lose
    try:
        if mode == "replace":
            result = _replace(data, db)
        else:
            result = _merge(data, db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    result["safety_snapshot"] = safety
    return result


def _replace(data: dict, db: Session) -> dict:
    for model in (models.Entry, models.Source, models.BankAccount, models.Settings):
        db.query(model).delete()
    db.flush()
    for s in data["sources"]:
        db.add(models.Source(id=s["id"], name=s["name"], created_at=_dt(s.get("created_at"))))
    for b in data["bank_accounts"]:
        db.add(models.BankAccount(id=b["id"], name=b["name"], created_at=_dt(b.get("created_at"))))
    db.flush()
    src_ids = {s["id"] for s in data["sources"]}
    bank_ids = {b["id"] for b in data["bank_accounts"]}
    for e in data["entries"]:
        sid = e.get("source_id") if e.get("source_id") in src_ids else None
        bid = e.get("bank_account_id") if e.get("bank_account_id") in bank_ids else None
        db.add(_make_entry(e, sid, bid, keep_id=True))
    if data["settings"]:
        db.add(models.Settings(id=data["settings"][0].get("id", 1),
                               base_currency=data["settings"][0].get("base_currency") or "USD"))
    db.flush()
    return {"added": len(data["entries"]), "skipped": 0}


def _merge(data: dict, db: Session) -> dict:
    new, dup = _split_new(data, db)

    def ensure(model, rows):
        have = {r.name.strip().lower(): r.id for r in db.query(model)}
        mapping = {}
        for r in rows:
            key = (r.get("name") or "").strip().lower()
            if not key:
                continue
            if key not in have:
                obj = model(name=r["name"].strip())
                db.add(obj)
                db.flush()
                have[key] = obj.id
            mapping[r["id"]] = have[key]
        return mapping

    src_map = ensure(models.Source, data["sources"])
    bank_map = ensure(models.BankAccount, data["bank_accounts"])
    for e in new:
        db.add(_make_entry(e, src_map.get(e.get("source_id")), bank_map.get(e.get("bank_account_id")), keep_id=False))
    db.flush()
    return {"added": len(new), "skipped": dup}
