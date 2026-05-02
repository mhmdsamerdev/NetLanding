from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/settings", tags=["settings"])


def get_or_create_settings(db: Session) -> models.Settings:
    settings = db.query(models.Settings).first()
    if not settings:
        settings = models.Settings(base_currency="USD")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=schemas.SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.put("", response_model=schemas.SettingsOut)
def update_settings(payload: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    settings.base_currency = payload.base_currency
    db.commit()
    db.refresh(settings)
    return settings
