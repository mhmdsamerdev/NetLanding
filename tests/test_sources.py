import json
import sqlite3

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from netlanding import backup, migrations, models
from netlanding.database import SessionLocal
from netlanding.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh():
    with SessionLocal() as db:
        for m in (models.Entry, models.Source, models.BankAccount, models.Settings):
            db.query(m).delete()
        db.add(models.Settings(base_currency="USD"))
        db.commit()
    for p in backup.backups_dir().iterdir():
        p.unlink()


def _preview_apply(payload: dict, mode: str):
    p = client.post("/api/data/import/preview", content=json.dumps(payload).encode())
    assert p.status_code == 200, p.text
    r = client.post("/api/data/import/apply", json={"token": p.json()["token"], "mode": mode})
    assert r.status_code == 200, r.text


def test_create_and_read_back():
    r = client.post("/api/sources", json={"name": "Upwork", "default_fee_percent": 10, "clearing_days": 14})
    assert r.status_code == 201
    assert (r.json()["default_fee_percent"], r.json()["clearing_days"]) == (10, 14)
    got = client.get("/api/sources").json()[0]
    assert (got["default_fee_percent"], got["clearing_days"]) == (10, 14)


def test_create_without_fields_is_empty():
    r = client.post("/api/sources", json={"name": "Direct"}).json()
    assert r["default_fee_percent"] is None and r["clearing_days"] is None


@pytest.mark.parametrize("body", [
    {"default_fee_percent": -1}, {"default_fee_percent": 100.5}, {"clearing_days": -1}, {"clearing_days": 1.5},
    {"default_fee_percent": "abc"},
])
def test_validation_on_create_and_update(body):
    assert client.post("/api/sources", json={"name": "X", **body}).status_code == 422
    sid = client.post("/api/sources", json={"name": "Y"}).json()["id"]
    assert client.patch(f"/api/sources/{sid}", json=body).status_code == 422


def test_boundaries_accepted():
    r = client.post("/api/sources", json={"name": "Edge", "default_fee_percent": 0, "clearing_days": 0})
    assert r.status_code == 201 and r.json()["default_fee_percent"] == 0 and r.json()["clearing_days"] == 0
    assert client.post("/api/sources", json={"name": "Max", "default_fee_percent": 100}).status_code == 201


def test_patch_sets_clears_and_omits():
    sid = client.post("/api/sources", json={"name": "Fiverr", "default_fee_percent": 20, "clearing_days": 14}).json()["id"]
    r = client.patch(f"/api/sources/{sid}", json={"clearing_days": 7}).json()
    assert (r["default_fee_percent"], r["clearing_days"]) == (20, 7)  # omitted field kept
    r = client.patch(f"/api/sources/{sid}", json={"default_fee_percent": None}).json()
    assert (r["default_fee_percent"], r["clearing_days"]) == (None, 7)  # null clears
    assert client.patch("/api/sources/9999", json={"clearing_days": 1}).status_code == 404


def test_patch_rename_rules():
    a = client.post("/api/sources", json={"name": "A"}).json()["id"]
    client.post("/api/sources", json={"name": "B"})
    assert client.patch(f"/api/sources/{a}", json={"name": "B"}).status_code == 400
    assert client.patch(f"/api/sources/{a}", json={"name": "  "}).status_code == 422
    assert client.patch(f"/api/sources/{a}", json={"name": "A2"}).json()["name"] == "A2"


def test_export_contains_fields_and_roundtrips():
    client.post("/api/sources", json={"name": "Upwork", "default_fee_percent": 10, "clearing_days": 14})
    raw = client.get("/api/data/export.json").content
    src = json.loads(raw)["sources"][0]
    assert src["default_fee_percent"] == 10 and src["clearing_days"] == 14
    with SessionLocal() as db:
        db.query(models.Source).delete()
        db.commit()
    _preview_apply(json.loads(raw), "replace")
    got = client.get("/api/sources").json()[0]
    assert (got["default_fee_percent"], got["clearing_days"]) == (10, 14)


@pytest.mark.parametrize("mode", ["replace", "merge"])
def test_old_export_without_fields_imports_as_empty(mode):
    old = {"format": "netlanding-export", "version": 1, "settings": [{"id": 1, "base_currency": "USD"}],
           "sources": [{"id": 1, "name": "Legacy", "created_at": None}], "bank_accounts": [],
           "entries": [{"id": 1, "project_client_name": "P", "gross_amount": 5, "source_id": 1}]}
    _preview_apply(old, mode)
    got = client.get("/api/sources").json()
    assert [(s["name"], s["default_fee_percent"], s["clearing_days"]) for s in got] == [("Legacy", None, None)]


def test_merge_leaves_existing_source_untouched_but_fills_new_ones():
    client.post("/api/sources", json={"name": "Upwork", "default_fee_percent": 10})
    _preview_apply({"format": "netlanding-export", "version": 1, "settings": [], "bank_accounts": [], "entries": [],
                    "sources": [{"id": 1, "name": "upwork", "default_fee_percent": 99, "clearing_days": 3},
                                {"id": 2, "name": "Fiverr", "default_fee_percent": 20, "clearing_days": 14}]}, "merge")
    by = {s["name"]: s for s in client.get("/api/sources").json()}
    assert (by["Upwork"]["default_fee_percent"], by["Upwork"]["clearing_days"]) == (10, None)
    assert (by["Fiverr"]["default_fee_percent"], by["Fiverr"]["clearing_days"]) == (20, 14)


def test_import_rejects_bad_source_values():
    bad = {"format": "netlanding-export", "version": 1, "settings": [], "bank_accounts": [], "entries": [],
           "sources": [{"id": 1, "name": "S", "default_fee_percent": 150}]}
    r = client.post("/api/data/import/preview", content=json.dumps(bad).encode())
    assert r.status_code == 400 and "Nothing was imported" in r.json()["detail"]


def test_old_sqlite_snapshot_without_columns_imports(tmp_path):
    f = tmp_path / "old.db"
    con = sqlite3.connect(f)
    con.executescript("""
        create table sources(id integer primary key, name text not null unique, created_at datetime);
        create table entries(id integer primary key, project_client_name text not null, gross_amount float not null,
                             gross_currency text, source_id integer);
        insert into sources values (1, 'Old', null);
        insert into entries values (1, 'P', 5, 'USD', 1);""")
    con.commit()
    con.close()
    p = client.post("/api/data/import/preview", content=f.read_bytes())
    assert p.status_code == 200
    client.post("/api/data/import/apply", json={"token": p.json()["token"], "mode": "replace"})
    got = client.get("/api/sources").json()[0]
    assert (got["name"], got["default_fee_percent"], got["clearing_days"]) == ("Old", None, None)


def test_migration_adds_columns_keeps_data_and_is_idempotent(tmp_path):
    db = tmp_path / "legacy.db"
    con = sqlite3.connect(db)
    con.executescript("""
        create table sources(id integer primary key, name varchar not null unique, created_at datetime);
        insert into sources values (1, 'Upwork', null), (2, 'Fiverr', null);""")
    con.commit()
    con.close()
    engine = create_engine(f"sqlite:///{db}")
    migrations.migrate(engine)
    migrations.migrate(engine)  # second run is a no-op
    con = sqlite3.connect(db)
    cols = [r[1] for r in con.execute("pragma table_info(sources)")]
    assert cols == ["id", "name", "created_at", "default_fee_percent", "clearing_days"]
    assert con.execute("select id, name, default_fee_percent, clearing_days from sources order by id").fetchall() == [
        (1, "Upwork", None, None), (2, "Fiverr", None, None)]
