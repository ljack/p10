from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from ..database import get_session
from ..services import (
    as_utc,
    calculate_kwh,
    current_year_month,
    daterange,
    estimate_cost,
    get_price_lookup,
    month_window,
    year_month_from_datetime,
)


router = APIRouter(prefix="/consumption", tags=["consumption"])


def build_time_filters(period: str | None, from_date: date | None, to_date: date | None) -> tuple[str, datetime | None, datetime | None]:
    normalized_period = (period or "").lower()
    if from_date and to_date and from_date > to_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'from' must be on or before 'to'")

    if period is None and from_date is None and to_date is None:
        return "all", None, None
    if period is None:
        start_dt = datetime.combine(from_date, time.min, tzinfo=timezone.utc) if from_date else None
        end_dt = datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=timezone.utc) if to_date else None
        return "custom", start_dt, end_dt

    now = datetime.now(timezone.utc)
    if from_date:
        start_date = from_date
    elif normalized_period == "day":
        start_date = now.date()
    elif normalized_period == "week":
        start_date = now.date() - timedelta(days=now.weekday())
    else:
        start_date = now.date().replace(day=1)

    if to_date:
        end_date = to_date
    elif normalized_period == "day":
        end_date = start_date
    elif normalized_period == "week":
        end_date = start_date + timedelta(days=6)
    else:
        _, month_end, _ = month_window(current_year_month())
        end_date = (month_end - timedelta(days=1)).date()

    start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=timezone.utc)
    return normalized_period, start_dt, end_dt


async def fetch_logs(
    session: AsyncSession,
    device_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    period: str | None = None,
) -> list[tuple[models.ConsumptionLog, models.Device]]:
    _, start_dt, end_dt = build_time_filters(period, from_date, to_date)
    query = select(models.ConsumptionLog, models.Device).join(
        models.Device, models.Device.id == models.ConsumptionLog.device_id
    )
    if start_dt is not None:
        query = query.where(models.ConsumptionLog.started_at >= start_dt)
    if end_dt is not None:
        query = query.where(models.ConsumptionLog.started_at < end_dt)
    if device_id is not None:
        query = query.where(models.ConsumptionLog.device_id == device_id)
    result = await session.execute(query.order_by(models.ConsumptionLog.started_at.desc()))
    return list(result.all())


@router.post("", response_model=schemas.ConsumptionLogOut, status_code=status.HTTP_201_CREATED)
async def create_consumption_log(
    payload: schemas.ConsumptionCreate,
    session: AsyncSession = Depends(get_session),
) -> schemas.ConsumptionLogOut:
    device = await session.get(models.Device, payload.device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    if not device.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot log consumption for an inactive device")

    log = models.ConsumptionLog(
        device_id=device.id,
        started_at=as_utc(payload.started_at),
        duration_minutes=payload.duration_minutes,
        kwh=calculate_kwh(device.wattage, payload.duration_minutes),
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)

    months = {year_month_from_datetime(log.started_at)}
    price_lookup, fallback_price = await get_price_lookup(session, months)
    return schemas.ConsumptionLogOut(
        id=log.id,
        device_id=log.device_id,
        started_at=as_utc(log.started_at),
        duration_minutes=log.duration_minutes,
        kwh=round(float(log.kwh), 3),
        recorded_at=as_utc(log.recorded_at),
        estimated_cost=estimate_cost(log.kwh, year_month_from_datetime(log.started_at), price_lookup, fallback_price),
        device=schemas.DeviceMiniOut.model_validate(device),
    )


@router.get("", response_model=list[schemas.ConsumptionLogOut])
async def list_consumption_logs(
    device_id: int | None = None,
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    session: AsyncSession = Depends(get_session),
) -> list[schemas.ConsumptionLogOut]:
    rows = await fetch_logs(session, device_id=device_id, from_date=from_date, to_date=to_date)
    if not rows:
        return []

    months = {year_month_from_datetime(log.started_at) for log, _ in rows}
    price_lookup, fallback_price = await get_price_lookup(session, months)

    return [
        schemas.ConsumptionLogOut(
            id=log.id,
            device_id=log.device_id,
            started_at=as_utc(log.started_at),
            duration_minutes=log.duration_minutes,
            kwh=round(float(log.kwh), 3),
            recorded_at=as_utc(log.recorded_at),
            estimated_cost=estimate_cost(log.kwh, year_month_from_datetime(log.started_at), price_lookup, fallback_price),
            device=schemas.DeviceMiniOut.model_validate(device),
        )
        for log, device in rows
    ]


@router.get("/stats", response_model=schemas.ConsumptionStatsOut)
async def consumption_stats(
    period: str = Query("month", pattern="^(day|week|month)$"),
    device_id: int | None = None,
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    session: AsyncSession = Depends(get_session),
) -> schemas.ConsumptionStatsOut:
    normalized_period, start_dt, end_dt = build_time_filters(period, from_date, to_date)
    rows = await fetch_logs(session, device_id=device_id, from_date=from_date, to_date=to_date, period=period)
    months = {year_month_from_datetime(log.started_at) for log, _ in rows}
    price_lookup, fallback_price = await get_price_lookup(session, months)

    total_kwh = 0.0
    total_cost = 0.0
    by_device: dict[int, dict[str, object]] = {}
    by_type: dict[str, dict[str, object]] = {}
    daily_totals = defaultdict(float)

    for log, device in rows:
        year_month = year_month_from_datetime(log.started_at)
        log_cost = estimate_cost(log.kwh, year_month, price_lookup, fallback_price)
        total_kwh += float(log.kwh)
        total_cost += log_cost
        daily_totals[log.started_at.date()] += float(log.kwh)

        if device.id not in by_device:
            by_device[device.id] = {
                "device_id": device.id,
                "name": device.name,
                "type": device.type,
                "location": device.location,
                "total_kwh": 0.0,
                "total_cost": 0.0,
                "log_count": 0,
            }
        device_entry = by_device[device.id]
        device_entry["total_kwh"] = round(float(device_entry["total_kwh"]) + float(log.kwh), 3)
        device_entry["total_cost"] = round(float(device_entry["total_cost"]) + log_cost, 2)
        device_entry["log_count"] = int(device_entry["log_count"]) + 1

        if device.type not in by_type:
            by_type[device.type] = {
                "type": device.type,
                "total_kwh": 0.0,
                "total_cost": 0.0,
                "log_count": 0,
            }
        type_entry = by_type[device.type]
        type_entry["total_kwh"] = round(float(type_entry["total_kwh"]) + float(log.kwh), 3)
        type_entry["total_cost"] = round(float(type_entry["total_cost"]) + log_cost, 2)
        type_entry["log_count"] = int(type_entry["log_count"]) + 1

    range_days = daterange(start_dt.date(), (end_dt - timedelta(days=1)).date())
    daily_usage = [
        schemas.DailyUsageItem(day=entry_date, total_kwh=round(daily_totals.get(entry_date, 0.0), 3))
        for entry_date in range_days
    ]
    avg_daily_kwh = round(total_kwh / max(len(range_days), 1), 3)

    return schemas.ConsumptionStatsOut(
        period=normalized_period,
        from_date=start_dt.date(),
        to_date=(end_dt - timedelta(days=1)).date(),
        total_kwh=round(total_kwh, 3),
        total_cost=round(total_cost, 2),
        avg_daily_kwh=avg_daily_kwh,
        by_device=[schemas.DeviceBreakdownItem(**item) for item in sorted(by_device.values(), key=lambda item: item["total_kwh"], reverse=True)],
        by_type=[schemas.TypeBreakdownItem(**item) for item in sorted(by_type.values(), key=lambda item: item["total_kwh"], reverse=True)],
        daily_usage=daily_usage,
    )
