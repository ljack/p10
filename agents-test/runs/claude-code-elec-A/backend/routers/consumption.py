from datetime import datetime, date, timedelta
from typing import Optional

import sqlalchemy
from fastapi import APIRouter, HTTPException, Query

from database import database
from models import consumption_logs, devices, budgets
from schemas import ConsumptionCreate, ConsumptionOut, ConsumptionStats, DeviceBreakdown, TypeBreakdown

router = APIRouter(prefix="/api/consumption", tags=["consumption"])

DEFAULT_PRICE_PER_KWH = 0.15


@router.get("/stats", response_model=ConsumptionStats)
async def consumption_stats(
    period: str = Query("month", pattern="^(day|week|month)$"),
    device_id: Optional[int] = Query(None),
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
):
    # Determine date range based on period if not explicitly provided
    now = datetime.utcnow()
    if from_date is None:
        if period == "day":
            from_dt = datetime(now.year, now.month, now.day)
        elif period == "week":
            from_dt = now - timedelta(days=now.weekday())
            from_dt = datetime(from_dt.year, from_dt.month, from_dt.day)
        else:  # month
            from_dt = datetime(now.year, now.month, 1)
    else:
        from_dt = datetime(from_date.year, from_date.month, from_date.day)

    if to_date is None:
        to_dt = now
    else:
        to_dt = datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59)

    # Build base condition
    conditions = [
        consumption_logs.c.started_at >= from_dt,
        consumption_logs.c.started_at <= to_dt,
    ]
    if device_id is not None:
        conditions.append(consumption_logs.c.device_id == device_id)

    # Total kWh
    total_query = sqlalchemy.select(
        sqlalchemy.func.coalesce(sqlalchemy.func.sum(consumption_logs.c.kwh), 0.0).label("total_kwh")
    ).where(sqlalchemy.and_(*conditions))
    total_row = await database.fetch_one(total_query)
    total_kwh = float(total_row._mapping["total_kwh"])

    # Determine price: look up budget for the month, fallback to default
    year_month = from_dt.strftime("%Y-%m")
    budget_row = await database.fetch_one(
        budgets.select().where(budgets.c.year_month == year_month)
    )
    price = budget_row._mapping["price_per_kwh"] if budget_row else DEFAULT_PRICE_PER_KWH

    total_cost = round(total_kwh * price, 2)

    # Average daily kWh
    days_span = max((to_dt - from_dt).days, 1)
    avg_daily_kwh = round(total_kwh / days_span, 4)

    # By device breakdown
    by_device_query = (
        sqlalchemy.select(
            consumption_logs.c.device_id,
            devices.c.name.label("device_name"),
            sqlalchemy.func.coalesce(sqlalchemy.func.sum(consumption_logs.c.kwh), 0.0).label("total_kwh"),
        )
        .select_from(consumption_logs.join(devices, consumption_logs.c.device_id == devices.c.id))
        .where(sqlalchemy.and_(*conditions))
        .group_by(consumption_logs.c.device_id, devices.c.name)
        .order_by(sqlalchemy.desc("total_kwh"))
    )
    by_device_rows = await database.fetch_all(by_device_query)
    by_device = [
        DeviceBreakdown(
            device_id=r._mapping["device_id"],
            device_name=r._mapping["device_name"],
            total_kwh=round(float(r._mapping["total_kwh"]), 4),
        )
        for r in by_device_rows
    ]

    # By type breakdown
    by_type_query = (
        sqlalchemy.select(
            devices.c.type,
            sqlalchemy.func.coalesce(sqlalchemy.func.sum(consumption_logs.c.kwh), 0.0).label("total_kwh"),
        )
        .select_from(consumption_logs.join(devices, consumption_logs.c.device_id == devices.c.id))
        .where(sqlalchemy.and_(*conditions))
        .group_by(devices.c.type)
        .order_by(sqlalchemy.desc("total_kwh"))
    )
    by_type_rows = await database.fetch_all(by_type_query)
    by_type = [
        TypeBreakdown(
            type=r._mapping["type"],
            total_kwh=round(float(r._mapping["total_kwh"]), 4),
        )
        for r in by_type_rows
    ]

    return ConsumptionStats(
        total_kwh=round(total_kwh, 4),
        total_cost=total_cost,
        avg_daily_kwh=avg_daily_kwh,
        by_device=by_device,
        by_type=by_type,
    )


@router.get("", response_model=list[ConsumptionOut])
async def list_consumption(
    device_id: Optional[int] = Query(None),
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    j = consumption_logs.join(devices, consumption_logs.c.device_id == devices.c.id)
    query = (
        sqlalchemy.select(
            consumption_logs,
            devices.c.name.label("device_name"),
        )
        .select_from(j)
    )

    conditions = []
    if device_id is not None:
        conditions.append(consumption_logs.c.device_id == device_id)
    if from_date is not None:
        conditions.append(
            consumption_logs.c.started_at >= datetime(from_date.year, from_date.month, from_date.day)
        )
    if to_date is not None:
        conditions.append(
            consumption_logs.c.started_at
            <= datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59)
        )

    if conditions:
        query = query.where(sqlalchemy.and_(*conditions))

    query = query.order_by(consumption_logs.c.started_at.desc()).limit(limit).offset(offset)

    rows = await database.fetch_all(query)
    return [ConsumptionOut(**dict(r._mapping)) for r in rows]


@router.post("", response_model=ConsumptionOut, status_code=201)
async def create_consumption(payload: ConsumptionCreate):
    # Look up device to get wattage
    device = await database.fetch_one(
        devices.select().where(devices.c.id == payload.device_id)
    )
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    wattage = device._mapping["wattage"]
    kwh = round(wattage * payload.duration_minutes / 60 / 1000, 4)

    insert_query = consumption_logs.insert().values(
        device_id=payload.device_id,
        started_at=payload.started_at,
        duration_minutes=payload.duration_minutes,
        kwh=kwh,
    )
    last_id = await database.execute(insert_query)

    # Fetch back with device name
    j = consumption_logs.join(devices, consumption_logs.c.device_id == devices.c.id)
    row = await database.fetch_one(
        sqlalchemy.select(consumption_logs, devices.c.name.label("device_name"))
        .select_from(j)
        .where(consumption_logs.c.id == last_id)
    )
    return ConsumptionOut(**dict(row._mapping))
