from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, computed_field


class SourceBase(BaseModel):
    name: str


class SourceCreate(SourceBase):
    pass


class SourceOut(SourceBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BankAccountBase(BaseModel):
    name: str


class BankAccountCreate(BankAccountBase):
    pass


class BankAccountOut(BankAccountBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class EntryBase(BaseModel):
    project_client_name: str
    gross_amount: float
    gross_currency: str = "USD"
    platform_fee: float = 0.0
    withdrawal_fee: float = 0.0
    source_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    status: str = "Pending"
    date_received: Optional[date] = None
    date_available: Optional[date] = None
    date_expiry: Optional[date] = None
    current_location: Optional[str] = None
    date_withdrawn: Optional[date] = None
    date_cleared: Optional[date] = None
    invoice_ref: Optional[str] = None
    notes: Optional[str] = None


class EntryCreate(EntryBase):
    pass


class EntryUpdate(EntryBase):
    project_client_name: Optional[str] = None
    gross_amount: Optional[float] = None
    gross_currency: Optional[str] = None
    platform_fee: Optional[float] = None
    withdrawal_fee: Optional[float] = None
    status: Optional[str] = None


class EntryOut(EntryBase):
    id: int
    net_income: float
    created_at: datetime
    updated_at: datetime
    source: Optional[SourceOut] = None
    bank_account: Optional[BankAccountOut] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, "net_income") and callable(getattr(type(obj), "net_income", None)):
            pass
        return super().model_validate(obj, *args, **kwargs)


class SettingsBase(BaseModel):
    base_currency: str = "USD"


class SettingsOut(SettingsBase):
    id: int

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    base_currency: str


class ExpiryWarning(BaseModel):
    date: date
    net: float
    currency: str
    label: str


class PerSourceBreakdown(BaseModel):
    source_name: str
    total_gross: float
    total_net: float
    entry_count: int


class StatusCounts(BaseModel):
    pending: int
    available: int
    withdrawn: int
    in_bank: int


class DashboardOut(BaseModel):
    total_gross_all_time: float
    total_net_all_time: float
    total_fees_all_time: float
    gross_this_month: float
    net_this_month: float
    fees_this_month: float
    cleared_this_month: float
    platform_fees_this_month: float
    withdrawal_fees_this_month: float
    per_source_breakdown: list[PerSourceBreakdown]
    status_counts: StatusCounts
    pending_net: float
    available_net: float
    withdrawn_net: float
    in_bank_net: float
    avg_days_to_clear: float
    avg_days_per_source: list[dict]
    currency_warning: bool
    base_currency: str
    available_overdue_amount: float
    available_overdue_days: int
    expiry_warnings: list["ExpiryWarning"] = []
