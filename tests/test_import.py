import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from netlanding import backup, models
from netlanding.database import SessionLocal
from netlanding.main import app

client = TestClient(app)


def _reset(rows=2):
    with SessionLocal() as db:
        for m in (models.Entry, models.Source, models.BankAccount, models.Settings):
            db.query(m).delete()
        s = models.Source(name="Upwork")
        b = models.BankAccount(name="Wise")
        db.add_all([s, b, models.Settings(base_currency="EUR")])
        db.flush()
        for i in range(rows):
            db.add(models.Entry(project_client_name=f"Client {i}", gross_amount=100 + i,
                                platform_fee=10, source_id=s.id, bank_account_id=b.id))
        db.commit()
    for p in backup.backups_dir().iterdir():
        p.unlink()


def _counts():
    with SessionLocal() as db:
        return db.query(models.Entry).count(), db.query(models.Source).count()


def _preview(raw):
    return client.post("/api/data/import/preview", content=raw)


def _apply(token, mode):
    return client.post("/api/data/import/apply", json={"token": token, "mode": mode})


@pytest.fixture(autouse=True)
def fresh():
    _reset()


def test_replace_roundtrip_restores_everything():
    export = client.get("/api/data/export.json").content
    _reset(rows=0)
    p = _preview(export).json()
    assert p["file"]["entries"] == 2 and p["current"]["entries"] == 0 and p["merge"]["new"] == 2
    r = _apply(p["token"], "replace").json()
    assert r["added"] == 2
    assert _counts() == (2, 1)
    assert client.get("/api/settings").json()["base_currency"] == "EUR"


def test_merge_is_idempotent_and_keeps_repeated_rows():
    with SessionLocal() as db:
        db.add(models.Entry(project_client_name="Client 0", gross_amount=100, platform_fee=10,
                            source_id=db.query(models.Source).first().id))
        db.commit()  # genuine repeat of Client 0
    export = client.get("/api/data/export.json").content
    assert _counts()[0] == 3
    p = _preview(export).json()
    assert p["merge"] == {"new": 0, "duplicates": 3}
    assert _apply(p["token"], "merge").json()["added"] == 0
    assert _counts()[0] == 3


def test_merge_adds_only_missing_and_maps_sources():
    export = json.loads(client.get("/api/data/export.json").content)
    export["sources"].append({"id": 99, "name": "Fiverr", "created_at": None})
    export["entries"].append({"id": 77, "project_client_name": "New", "gross_amount": 5,
                              "gross_currency": "USD", "source_id": 99, "status": "Pending"})
    p = _preview(json.dumps(export).encode()).json()
    assert p["merge"]["new"] == 1
    assert _apply(p["token"], "merge").json() == {"added": 1, "skipped": 2, "safety_snapshot": _snap()}
    assert _counts() == (3, 2)


def _snap():
    return backup.list_snapshots()[0]["name"]


def test_snapshot_import_and_undo():
    snap = backup.create_snapshot("manual").name
    _reset(rows=0)  # wipes snapshots too; recreate one representing the good state
    _reset(rows=2)
    snap = backup.create_snapshot("manual").name
    with SessionLocal() as db:
        db.query(models.Entry).delete()
        db.commit()
    p = client.post(f"/api/data/import/preview?snapshot={snap}").json()
    r = _apply(p["token"], "replace").json()
    assert _counts()[0] == 2
    # undo: restore the safety snapshot taken right before the import (0 entries)
    u = client.post(f"/api/data/import/preview?snapshot={r['safety_snapshot']}").json()
    _apply(u["token"], "replace")
    assert _counts()[0] == 0


def test_sqlite_upload():
    path = backup.create_snapshot("manual")
    p = _preview(path.read_bytes()).json()
    assert p["kind"] == "sqlite" and p["file"]["entries"] == 2


@pytest.mark.parametrize("raw", [b"", b"hello", b'{"format": "other"}',
                                 json.dumps({"format": "netlanding-export", "version": 99}).encode()])
def test_bad_files_rejected(raw):
    assert _preview(raw).status_code == 400


def test_invalid_row_rejected_at_preview():
    export = json.loads(client.get("/api/data/export.json").content)
    export["entries"].append({"id": 50, "project_client_name": "Bad", "gross_amount": "abc"})
    r = _preview(json.dumps(export).encode())
    assert r.status_code == 400 and "Nothing was imported" in r.json()["detail"]


def test_apply_failure_rolls_back():
    from netlanding import importer

    data = importer.load_upload(client.get("/api/data/export.json").content)
    token = importer.stage(data)
    data["entries"][1]["gross_amount"] = "abc"  # corrupt after validation
    r = _apply(token, "replace")
    assert r.status_code == 400
    assert _counts() == (2, 1)


def test_bad_snapshot_name_and_expired_token():
    assert client.post("/api/data/import/preview?snapshot=../../etc/passwd").status_code == 400
    assert _apply("nope", "merge").status_code == 400


def test_sqlite_file_missing_table_rejected(tmp_path):
    f = tmp_path / "x.db"
    sqlite3.connect(f).execute("create table t(a)").connection.commit()
    assert _preview(f.read_bytes()).status_code == 400
