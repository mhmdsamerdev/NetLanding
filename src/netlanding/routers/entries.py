from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/entries", tags=["entries"])


def entry_to_out(entry: models.Entry) -> schemas.EntryOut:
    data = {
        "id": entry.id,
        "project_client_name": entry.project_client_name,
        "gross_amount": entry.gross_amount,
        "gross_currency": entry.gross_currency,
        "platform_fee": entry.platform_fee or 0.0,
        "withdrawal_fee": entry.withdrawal_fee or 0.0,
        "net_income": entry.net_income,
        "source_id": entry.source_id,
        "bank_account_id": entry.bank_account_id,
        "status": entry.status,
        "date_received": entry.date_received,
        "date_available": entry.date_available,
        "date_expiry": entry.date_expiry,
        "current_location": entry.current_location,
        "date_withdrawn": entry.date_withdrawn,
        "date_cleared": entry.date_cleared,
        "invoice_ref": entry.invoice_ref,
        "notes": entry.notes,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
        "source": entry.source,
        "bank_account": entry.bank_account,
    }
    return schemas.EntryOut(**data)


@router.get("", response_model=list[schemas.EntryOut])
def list_entries(
    status: Optional[str] = Query(None),
    source_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Entry)
    if status:
        q = q.filter(models.Entry.status == status)
    if source_id:
        q = q.filter(models.Entry.source_id == source_id)
    if search:
        q = q.filter(models.Entry.project_client_name.ilike(f"%{search}%"))
    if date_from:
        q = q.filter(models.Entry.date_received >= date_from)
    if date_to:
        q = q.filter(models.Entry.date_received <= date_to)
    entries = q.order_by(models.Entry.created_at.desc()).all()
    return [entry_to_out(e) for e in entries]


@router.post("", response_model=schemas.EntryOut, status_code=201)
def create_entry(payload: schemas.EntryCreate, db: Session = Depends(get_db)):
    if payload.source_id:
        source = db.query(models.Source).filter(models.Source.id == payload.source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
    if payload.bank_account_id:
        bank = db.query(models.BankAccount).filter(models.BankAccount.id == payload.bank_account_id).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Bank account not found")

    entry = models.Entry(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry_to_out(entry)


@router.get("/{entry_id}", response_model=schemas.EntryOut)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.Entry).filter(models.Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry_to_out(entry)


@router.put("/{entry_id}", response_model=schemas.EntryOut)
def update_entry(entry_id: int, payload: schemas.EntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.Entry).filter(models.Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "source_id" in update_data and update_data["source_id"]:
        source = db.query(models.Source).filter(models.Source.id == update_data["source_id"]).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
    if "bank_account_id" in update_data and update_data["bank_account_id"]:
        bank = db.query(models.BankAccount).filter(models.BankAccount.id == update_data["bank_account_id"]).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Bank account not found")

    for key, value in update_data.items():
        setattr(entry, key, value)

    entry.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(entry)
    return entry_to_out(entry)


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.Entry).filter(models.Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
