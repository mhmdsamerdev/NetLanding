from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardOut)
def get_dashboard(db: Session = Depends(get_db)):
    settings = db.query(models.Settings).first()
    base_currency = settings.base_currency if settings else "USD"

    all_entries = db.query(models.Entry).all()
    now = datetime.utcnow()
    month_start = date(now.year, now.month, 1)

    total_gross = 0.0
    total_net = 0.0
    total_fees = 0.0
    gross_month = 0.0
    net_month = 0.0
    fees_month = 0.0
    cleared_month = 0.0
    platform_fees_month = 0.0
    withdrawal_fees_month = 0.0

    status_counts = {"Pending": 0, "Available": 0, "Withdrawn": 0, "In Bank": 0}
    status_net = {"Pending": 0.0, "Available": 0.0, "Withdrawn": 0.0, "In Bank": 0.0}
    source_map: dict[str, dict] = {}

    days_to_clear_list = []
    source_days_map: dict[str, list] = {}

    available_overdue_amount = 0.0
    available_overdue_days = 0
    oldest_available_date = None
    expiring_entries: list[dict] = []

    for e in all_entries:
        gross = e.gross_amount or 0
        fees = (e.platform_fee or 0) + (e.withdrawal_fee or 0)
        net = gross - fees

        total_gross += gross
        total_net += net
        total_fees += fees

        if e.date_received and e.date_received >= month_start:
            gross_month += gross
            net_month += net
            fees_month += fees
            platform_fees_month += e.platform_fee or 0
            withdrawal_fees_month += e.withdrawal_fee or 0

        if e.status == "In Bank" and e.date_cleared and e.date_cleared >= month_start:
            cleared_month += net

        status_key = e.status if e.status in status_counts else "Pending"
        status_counts[status_key] = status_counts.get(status_key, 0) + 1
        status_net[status_key] = status_net.get(status_key, 0.0) + net

        source_name = e.source.name if e.source else "Unknown"
        if source_name not in source_map:
            source_map[source_name] = {"total_gross": 0.0, "total_net": 0.0, "entry_count": 0}
        source_map[source_name]["total_gross"] += gross
        source_map[source_name]["total_net"] += net
        source_map[source_name]["entry_count"] += 1

        if e.date_cleared and e.date_withdrawn:
            delta = (e.date_cleared - e.date_withdrawn).days
            if delta >= 0:
                days_to_clear_list.append(delta)
                if source_name not in source_days_map:
                    source_days_map[source_name] = []
                source_days_map[source_name].append(delta)

        if e.status == "Available":
            available_overdue_amount += net
            check_date = e.date_available or e.date_received
            if check_date:
                days_waiting = (date.today() - check_date).days
                if oldest_available_date is None or check_date < oldest_available_date:
                    oldest_available_date = check_date
                    available_overdue_days = days_waiting

        if e.date_expiry and e.status in ("Pending", "Available") and e.date_expiry >= date.today():
            if (e.date_expiry - date.today()).days <= 30:
                expiring_entries.append({
                    "date": e.date_expiry,
                    "net": net,
                    "currency": e.gross_currency or "USD",
                    "label": e.project_client_name,
                })

    per_source = [
        schemas.PerSourceBreakdown(
            source_name=name,
            total_gross=vals["total_gross"],
            total_net=vals["total_net"],
            entry_count=vals["entry_count"],
        )
        for name, vals in source_map.items()
    ]

    avg_days = sum(days_to_clear_list) / len(days_to_clear_list) if days_to_clear_list else 0.0
    avg_per_source = [
        {"source_name": name, "avg_days": round(sum(days) / len(days), 1)}
        for name, days in source_days_map.items()
    ]

    return schemas.DashboardOut(
        total_gross_all_time=round(total_gross, 2),
        total_net_all_time=round(total_net, 2),
        total_fees_all_time=round(total_fees, 2),
        gross_this_month=round(gross_month, 2),
        net_this_month=round(net_month, 2),
        fees_this_month=round(fees_month, 2),
        cleared_this_month=round(cleared_month, 2),
        platform_fees_this_month=round(platform_fees_month, 2),
        withdrawal_fees_this_month=round(withdrawal_fees_month, 2),
        per_source_breakdown=per_source,
        status_counts=schemas.StatusCounts(
            pending=status_counts.get("Pending", 0),
            available=status_counts.get("Available", 0),
            withdrawn=status_counts.get("Withdrawn", 0),
            in_bank=status_counts.get("In Bank", 0),
        ),
        pending_net=round(status_net.get("Pending", 0.0), 2),
        available_net=round(status_net.get("Available", 0.0), 2),
        withdrawn_net=round(status_net.get("Withdrawn", 0.0), 2),
        in_bank_net=round(status_net.get("In Bank", 0.0), 2),
        avg_days_to_clear=round(avg_days, 1),
        avg_days_per_source=avg_per_source,
        currency_warning=False,
        base_currency=base_currency,
        available_overdue_amount=round(available_overdue_amount, 2),
        available_overdue_days=available_overdue_days,
        expiry_warnings=[
            schemas.ExpiryWarning(date=w["date"], net=round(w["net"], 2), currency=w["currency"], label=w["label"])
            for w in sorted(expiring_entries, key=lambda x: x["date"])
        ],
    )
