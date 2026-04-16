import calendar
from datetime import datetime

import sqlalchemy
from fastapi import APIRouter, HTTPException

from database import database
from models import budgets, consumption_logs
from schemas import BudgetCreate, BudgetUpdate, BudgetOut, BudgetWithUsage, BudgetStatus

router = APIRouter(prefix="/api/budget", tags=["budget"])


async def _get_month_usage(year_month: str) -> float:
    """Sum kWh for all consumption logs in a given YYYY-MM month."""
    year, month = int(year_month[:4]), int(year_month[5:7])
    start = datetime(year, month, 1)
    days_in_month = calendar.monthrange(year, month)[1]
    end = datetime(year, month, days_in_month, 23, 59, 59)

    query = sqlalchemy.select(
        sqlalchemy.func.coalesce(sqlalchemy.func.sum(consumption_logs.c.kwh), 0.0).label("total")
    ).where(
        sqlalchemy.and_(
            consumption_logs.c.started_at >= start,
            consumption_logs.c.started_at <= end,
        )
    )
    row = await database.fetch_one(query)
    return float(row._mapping["total"])


@router.get("", response_model=list[BudgetOut])
async def list_budgets():
    query = budgets.select().order_by(budgets.c.year_month.desc())
    rows = await database.fetch_all(query)
    return [BudgetOut(**dict(r._mapping)) for r in rows]


@router.post("", response_model=BudgetOut, status_code=201)
async def create_budget(payload: BudgetCreate):
    # Check uniqueness
    existing = await database.fetch_one(
        budgets.select().where(budgets.c.year_month == payload.year_month)
    )
    if existing:
        raise HTTPException(status_code=422, detail="Budget for this month already exists")

    last_id = await database.execute(
        budgets.insert().values(
            year_month=payload.year_month,
            budget_kwh=payload.budget_kwh,
            price_per_kwh=payload.price_per_kwh,
            alert_threshold_percent=payload.alert_threshold_percent,
        )
    )
    row = await database.fetch_one(budgets.select().where(budgets.c.id == last_id))
    return BudgetOut(**dict(row._mapping))


@router.get("/{year_month}", response_model=BudgetWithUsage)
async def get_budget(year_month: str):
    row = await database.fetch_one(
        budgets.select().where(budgets.c.year_month == year_month)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Budget not found")

    used_kwh = await _get_month_usage(year_month)
    return BudgetWithUsage(**dict(row._mapping), used_kwh=round(used_kwh, 4))


@router.put("/{year_month}", response_model=BudgetOut)
async def update_budget(year_month: str, payload: BudgetUpdate):
    existing = await database.fetch_one(
        budgets.select().where(budgets.c.year_month == year_month)
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Budget not found")

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    await database.execute(
        budgets.update().where(budgets.c.year_month == year_month).values(**update_data)
    )
    row = await database.fetch_one(
        budgets.select().where(budgets.c.year_month == year_month)
    )
    return BudgetOut(**dict(row._mapping))


@router.get("/{year_month}/status", response_model=BudgetStatus)
async def budget_status(year_month: str):
    row = await database.fetch_one(
        budgets.select().where(budgets.c.year_month == year_month)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Budget not found")

    data = dict(row._mapping)
    budget_kwh = data["budget_kwh"]
    price = data["price_per_kwh"]
    threshold = data["alert_threshold_percent"]

    used_kwh = await _get_month_usage(year_month)

    year, month = int(year_month[:4]), int(year_month[5:7])
    days_in_month = calendar.monthrange(year, month)[1]

    now = datetime.utcnow()
    if now.year == year and now.month == month:
        days_elapsed = max(now.day, 1)
    else:
        # For past months the month is complete; for future months use 1
        if datetime(year, month, 1) < now:
            days_elapsed = days_in_month
        else:
            days_elapsed = 1

    daily_avg = used_kwh / days_elapsed
    projected = round(daily_avg * days_in_month, 4)
    remaining = round(max(budget_kwh - used_kwh, 0), 4)
    used_percent = round((used_kwh / budget_kwh) * 100, 2) if budget_kwh > 0 else 0.0

    return BudgetStatus(
        budget_kwh=budget_kwh,
        used_kwh=round(used_kwh, 4),
        used_percent=used_percent,
        remaining_kwh=remaining,
        projected_end_of_month_kwh=projected,
        is_over_threshold=used_percent >= threshold,
        estimated_cost=round(used_kwh * price, 2),
        projected_cost=round(projected * price, 2),
    )
