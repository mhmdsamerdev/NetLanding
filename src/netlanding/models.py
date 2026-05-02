from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    entries = relationship("Entry", back_populates="source")


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    entries = relationship("Entry", back_populates="bank_account")


class Entry(Base):
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_client_name = Column(String, nullable=False)
    gross_amount = Column(Float, nullable=False)
    gross_currency = Column(String, nullable=False, default="USD")
    platform_fee = Column(Float, default=0.0)
    withdrawal_fee = Column(Float, default=0.0)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True)
    status = Column(String, nullable=False, default="Pending")
    date_received = Column(Date, nullable=True)
    date_available = Column(Date, nullable=True)
    date_expiry = Column(Date, nullable=True)
    current_location = Column(String, nullable=True)
    date_withdrawn = Column(Date, nullable=True)
    date_cleared = Column(Date, nullable=True)
    invoice_ref = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source = relationship("Source", back_populates="entries")
    bank_account = relationship("BankAccount", back_populates="entries")

    @property
    def net_income(self):
        return (self.gross_amount or 0) - (self.platform_fee or 0) - (self.withdrawal_fee or 0)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    base_currency = Column(String, nullable=False, default="USD")
