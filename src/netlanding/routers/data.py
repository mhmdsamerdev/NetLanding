import json
from datetime import datetime

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import backup, export, importer
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


# ── Import / restore ────────────────────────────────────────────────────────
class ApplyImport(BaseModel):
    token: str
    mode: Literal["merge", "replace"]


@router.post("/import/preview")
async def import_preview(request: Request, snapshot: str | None = None, db: Session = Depends(get_db)):
    try:
        if snapshot:
            data = importer.load_snapshot(snapshot)
        else:
            declared = int(request.headers.get("content-length") or 0)
            if declared > importer.MAX_BYTES:
                raise importer.ImportError_("File is too large (limit 100 MB).")
            raw = await request.body()
            if len(raw) > importer.MAX_BYTES:
                raise importer.ImportError_("File is too large (limit 100 MB).")
            data = importer.load_upload(raw)
        result = importer.preview(data, db)
    except importer.ImportError_ as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    result["token"] = importer.stage(data)
    return result


@router.post("/import/apply")
def import_apply(payload: ApplyImport, db: Session = Depends(get_db)):
    try:
        return importer.apply(importer.staged(payload.token), payload.mode, db)
    except importer.ImportError_ as exc:
        raise HTTPException(status_code=400, detail=str(exc))
