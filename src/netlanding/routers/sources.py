from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/sources", tags=["sources"])


@router.get("", response_model=list[schemas.SourceOut])
def list_sources(db: Session = Depends(get_db)):
    return db.query(models.Source).order_by(models.Source.name).all()


@router.post("", response_model=schemas.SourceOut, status_code=201)
def create_source(payload: schemas.SourceCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Source).filter(models.Source.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Source with this name already exists")
    source = models.Source(**payload.model_dump())
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.delete("/{source_id}", status_code=204)
def delete_source(source_id: int, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    entry_count = db.query(models.Entry).filter(models.Entry.source_id == source_id).count()
    if entry_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {entry_count} entr{'y' if entry_count == 1 else 'ies'} reference this source",
        )
    db.delete(source)
    db.commit()
