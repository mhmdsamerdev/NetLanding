import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from .. import backup, export
from ..database import get_db

router = APIRouter(prefix="/api/data", tags=["data"])


def _attachment(name: str) -> dict:
    return {"Content-Disposition": f'attachment; filename="{name}"'}


@router.get("/export.json")
def export_json(db: Session = Depends(get_db)):
    body = json.dumps(export.export_json(db), indent=2, ensure_ascii=False)
    return Response(body, media_type="application/json",
                    headers=_attachment(f"netlanding-{datetime.now():%Y%m%d}.json"))


@router.get("/export.csv")
def export_csv(db: Session = Depends(get_db)):
    body = "﻿" + export.export_entries_csv(db)  # BOM so Excel reads UTF-8
    return Response(body, media_type="text/csv; charset=utf-8",
                    headers=_attachment(f"netlanding-entries-{datetime.now():%Y%m%d}.csv"))


@router.get("/backups")
def list_backups():
    return {"directory": str(backup.backups_dir()), "backups": backup.list_snapshots()}


@router.post("/backups", status_code=201)
def create_backup():
    try:
        path = backup.create_snapshot("manual")
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    backup.prune()
    return {"name": path.name}


@router.get("/backups/{name}")
def download_backup(name: str):
    if not backup.is_valid_name(name):
        raise HTTPException(status_code=404, detail="Backup not found")
    path = backup.backups_dir() / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Backup not found")
    return FileResponse(path, media_type="application/octet-stream", filename=name)
