from __future__ import annotations

import calendar
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from . import models, schemas


DEFAULT_PRICE_PER_KWH = 0.24


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def calculate_kwh(wattage: int, duration_minutes: int) -> float:
    return round((wattage * duration_minutes) / 60 / 1000, 3)


def normalize_year_month(year_month: str) -> str:
    parsed = datetime.strptime(year_month, "%Y-%m")
    return parsed.strftime("%Y-%m")


def month_window(year_month: str) -> tuple[datetime, datetime, int]:
    normalized = normalize_year_month(year_month)
    start = datetime.strptime(f"{normalized}-01", "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    days_in_month = calendar.monthrange(start.year, start.month)[1]
    return start, end, days_in_month


def year_month_from_datetime(value: datetime) -> str:
    return as_utc(value).strftime("%Y-%m")


def current_year_month() -> str:
    return utc_now().strftime("%Y-%m")


def daterange(start_date: date, end_date: date) -> list[date]:
    total_days = (end_date - start_date).days
    return [start_date + timedelta(days=offset) for offset in range(total_days + 1)]


def ensure_schedule_window(start_time: time, end_time: time) -> None:
    if end_time <= start_time:
        raise ValueError("end_time must be later than start_time")


async def get_default_price(session: AsyncSession) -> float:
    result = await session.execute(select(models.Budget.price_per_kwh).order_by(models.Budget.year_month.desc()).limit(1))
    latest = result.scalar_one_or_none()
    return float(latest) if latest is not None else DEFAULT_PRICE_PER_KWH


async def get_price_lookup(session: AsyncSession, months: set[str]) -> tuple[dict[str, float], float]:
    lookup: dict[str, float] = {}
    if months:
        rows = await session.execute(
            select(models.Budget.year_month, models.Budget.price_per_kwh).where(models.Budget.year_month.in_(sorted(months)))
        )
        lookup = {year_month: float(price) for year_month, price in rows.all()}
    return lookup, await get_default_price(session)


def estimate_cost(kwh: float, year_month: str, price_lookup: dict[str, float], fallback_price: float) -> float:
    price = price_lookup.get(year_month, fallback_price)
    return round(kwh * price, 2)


async def calculate_budget_status(session: AsyncSession, budget: models.Budget) -> schemas.BudgetStatusOut:
    start, end, days_in_month = month_window(budget.year_month)
    total_result = await session.execute(
        select(func.coalesce(func.sum(models.ConsumptionLog.kwh), 0.0)).where(
            models.ConsumptionLog.started_at >= start,
            models.ConsumptionLog.started_at < end,
        )
    )
    used_kwh = round(float(total_result.scalar_one()), 3)
    used_percent = round((used_kwh / budget.budget_kwh) * 100, 1) if budget.budget_kwh else 0.0
    remaining_kwh = round(max(budget.budget_kwh - used_kwh, 0.0), 3)
    today = utc_now().date()
    month_start = start.date()
    month_end = (end - timedelta(days=1)).date()

    if today < month_start:
        projected = 0.0
    elif today > month_end:
        projected = used_kwh
    else:
        elapsed_days = max(today.day, 1)
        avg_daily = used_kwh / elapsed_days
        projected = avg_daily * days_in_month

    return schemas.BudgetStatusOut(
        year_month=budget.year_month,
        budget_kwh=round(float(budget.budget_kwh), 3),
        used_kwh=used_kwh,
        used_percent=used_percent,
        remaining_kwh=remaining_kwh,
        projected_end_of_month_kwh=round(projected, 3),
        is_over_threshold=used_percent >= budget.alert_threshold_percent,
        estimated_cost=round(used_kwh * float(budget.price_per_kwh), 2),
    )


async def build_budget_detail(session: AsyncSession, budget: models.Budget) -> schemas.BudgetDetailOut:
    status = await calculate_budget_status(session, budget)
    return schemas.BudgetDetailOut(
        id=budget.id,
        year_month=budget.year_month,
        budget_kwh=round(float(budget.budget_kwh), 3),
        price_per_kwh=round(float(budget.price_per_kwh), 3),
        alert_threshold_percent=budget.alert_threshold_percent,
        used_kwh=status.used_kwh,
        used_percent=status.used_percent,
        remaining_kwh=status.remaining_kwh,
        projected_end_of_month_kwh=status.projected_end_of_month_kwh,
        is_over_threshold=status.is_over_threshold,
        estimated_cost=status.estimated_cost,
    )
