import os
import sqlite3
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from netlanding import backup, models
from netlanding.database import SessionLocal
from netlanding.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def seed():
    with SessionLocal() as db:
        db.query(models.Entry).delete()
        db.query(models.Source).delete()
        s = models.Source(name="Upwork, Inc.")
        db.add(s)
        db.flush()
        db.add(models.Entry(project_client_name="Acme", gross_amount=100, platform_fee=10,
                            withdrawal_fee=5, source_id=s.id))
        db.commit()
    for p in backup.backups_dir().iterdir():
        p.unlink()


def test_snapshot_is_valid_and_complete():
    path = backup.create_snapshot("manual")
    con = sqlite3.connect(path)
    assert con.execute("select count(*) from entries").fetchone()[0] == 1
    assert con.execute("pragma integrity_check").fetchone()[0] == "ok"


def test_snapshot_if_due_respects_interval():
    assert backup.snapshot_if_due() is not None
    assert backup.snapshot_if_due() is None


def test_prune_keeps_newest_and_thins_old():
    d = backup.backups_dir()
    now = datetime.now()
    names = []
    for days, hour in [(0, 1), (40, 1), (40, 2), (41, 1)]:
        ts = now - timedelta(days=days)
        n = f"netlanding-{ts:%Y%m%d}-{hour:02d}0000.db"
        (d / n).write_bytes(b"x")
        t = ts.replace(hour=hour).timestamp()
        os.utime(d / n, (t, t))
        names.append(n)
    backup.prune(now)
    left = {s["name"] for s in backup.list_snapshots()}
    assert names[0] in left
    old = [n for n in names[1:] if n in left]
    # 40/41 days ago fall in the same month or adjacent: at most one per month survives
    assert len(old) <= 2 and len(old) < 3


def test_export_json():
    body = client.get("/api/data/export.json").json()
    assert body["format"] == "netlanding-export" and body["version"] == 1
    assert len(body["entries"]) == 1 and body["sources"][0]["name"] == "Upwork, Inc."


def test_export_csv():
    r = client.get("/api/data/export.csv")
    text = r.content.decode("utf-8-sig")
    lines = text.strip().splitlines()
    assert lines[0].startswith("id,project_client_name")
    assert '"Upwork, Inc."' in lines[1] and ",85.0," in lines[1]


def test_backup_endpoints_and_traversal():
    assert client.post("/api/data/backups").status_code == 201
    name = client.get("/api/data/backups").json()["backups"][0]["name"]
    assert client.get(f"/api/data/backups/{name}").status_code == 200
    assert client.get("/api/data/backups/nope.db").status_code == 404
    assert client.get("/api/data/backups/..%2F..%2Fetc%2Fpasswd").headers["content-type"].startswith("text/html") \
        or client.get("/api/data/backups/..%2F..%2Fetc%2Fpasswd").status_code == 404
    assert not backup.is_valid_name("../../etc/passwd")
    assert not backup.is_valid_name("netlanding-20260101-000000.db/../x")
