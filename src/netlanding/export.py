"""Full-fidelity JSON export and human-readable CSV export."""
import csv
import io
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from . import __version__, models

EXPORT_FORMAT = "netlanding-export"
EXPORT_VERSION = 1


def _row(obj) -> dict:
    out = {}
    for col in obj.__table__.columns:
        v = getattr(obj, col.name)
        out[col.name] = v.isoformat() if isinstance(v, (date, datetime)) else v
    return out


def export_json(db: Session) -> dict:
    return {
        "format": EXPORT_FORMAT,
        "version": EXPORT_VERSION,
        "app_version": __version__,
        "exported_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "settings": [_row(r) for r in db.query(models.Settings).order_by(models.Settings.id)],
        "sources": [_row(r) for r in db.query(models.Source).order_by(models.Source.id)],
        "bank_accounts": [_row(r) for r in db.query(models.BankAccount).order_by(models.BankAccount.id)],
        "entries": [_row(r) for r in db.query(models.Entry).order_by(models.Entry.id)],
    }


CSV_COLUMNS = [
    "id", "project_client_name", "gross_amount", "gross_currency", "platform_fee",
    "withdrawal_fee", "net_income", "source", "bank_account", "status",
    "date_received", "date_available", "date_expiry", "current_location",
    "date_withdrawn", "date_cleared", "invoice_ref", "notes", "created_at", "updated_at",
]


def export_entries_csv(db: Session) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(CSV_COLUMNS)
    for e in db.query(models.Entry).order_by(models.Entry.id):
        data = _row(e)
        data["net_income"] = e.net_income
        data["source"] = e.source.name if e.source else ""
        data["bank_account"] = e.bank_account.name if e.bank_account else ""
        w.writerow(["" if data.get(c) is None else data[c] for c in CSV_COLUMNS])
    return buf.getvalue()
