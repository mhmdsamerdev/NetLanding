from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/bank-accounts", tags=["bank_accounts"])


@router.get("", response_model=list[schemas.BankAccountOut])
def list_bank_accounts(db: Session = Depends(get_db)):
    return db.query(models.BankAccount).order_by(models.BankAccount.name).all()


@router.post("", response_model=schemas.BankAccountOut, status_code=201)
def create_bank_account(payload: schemas.BankAccountCreate, db: Session = Depends(get_db)):
    existing = db.query(models.BankAccount).filter(models.BankAccount.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bank account with this name already exists")
    account = models.BankAccount(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=204)
def delete_bank_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(models.BankAccount).filter(models.BankAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    entry_count = db.query(models.Entry).filter(models.Entry.bank_account_id == account_id).count()
    if entry_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {entry_count} entr{'y' if entry_count == 1 else 'ies'} reference this bank account",
        )
    db.delete(account)
    db.commit()
