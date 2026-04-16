from fastapi import APIRouter, HTTPException
from database import get_db
from models import BudgetCreate, BudgetUpdate, BudgetResponse
import datetime
import calendar

router = APIRouter(prefix="/api/budget", tags=["budget"])


@router.get("", response_model=list[BudgetResponse])
async def list_budgets():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM budgets ORDER BY year_month DESC")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=BudgetResponse, status_code=201)
async def create_budget(budget: BudgetCreate):
    db = await get_db()
    try:
        # Check uniqueness
        cursor = await db.execute(
            "SELECT id FROM budgets WHERE year_month = ?", (budget.year_month,)
        )
        if await cursor.fetchone():
            raise HTTPException(
                status_code=409, detail="Budget for this month already exists"
            )

        cursor = await db.execute(
            "INSERT INTO budgets (year_month, budget_kwh, price_per_kwh, alert_threshold_percent) VALUES (?, ?, ?, ?)",
            (
                budget.year_month,
                budget.budget_kwh,
                budget.price_per_kwh,
                budget.alert_threshold_percent,
            ),
        )
        await db.commit()
        bid = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM budgets WHERE id = ?", (bid,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.get("/{year_month}")
async def get_budget(year_month: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM budgets WHERE year_month = ?", (year_month,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Budget not found")

        budget = dict(row)

        # Get usage for this month
        cursor = await db.execute(
            """
            SELECT COALESCE(SUM(kwh), 0) as used_kwh
            FROM consumption_logs
            WHERE strftime('%Y-%m', started_at) = ?
            """,
            (year_month,),
        )
        usage = await cursor.fetchone()
        budget["used_kwh"] = round(usage["used_kwh"], 3)

        return budget
    finally:
        await db.close()


@router.put("/{year_month}", response_model=BudgetResponse)
async def update_budget(year_month: str, budget: BudgetUpdate):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM budgets WHERE year_month = ?", (year_month,)
        )
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Budget not found")

        updates = budget.model_dump(exclude_none=True)
        if not updates:
            return dict(existing)

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [year_month]
        await db.execute(
            f"UPDATE budgets SET {set_clause} WHERE year_month = ?", values
        )
        await db.commit()

        cursor = await db.execute(
            "SELECT * FROM budgets WHERE year_month = ?", (year_month,)
        )
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.get("/{year_month}/status")
async def get_budget_status(year_month: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM budgets WHERE year_month = ?", (year_month,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Budget not found")

        budget = dict(row)

        # Get used kWh
        cursor = await db.execute(
            """
            SELECT COALESCE(SUM(kwh), 0) as used_kwh
            FROM consumption_logs
            WHERE strftime('%Y-%m', started_at) = ?
            """,
            (year_month,),
        )
        usage = await cursor.fetchone()
        used_kwh = round(usage["used_kwh"], 3)

        budget_kwh = budget["budget_kwh"]
        used_percent = round((used_kwh / budget_kwh * 100) if budget_kwh > 0 else 0, 1)
        remaining_kwh = round(max(budget_kwh - used_kwh, 0), 3)

        # Project end-of-month usage
        today = datetime.date.today()
        year = int(year_month[:4])
        month = int(year_month[5:7])
        days_in_month = calendar.monthrange(year, month)[1]

        if year == today.year and month == today.month:
            day_of_month = today.day
        elif (year, month) < (today.year, today.month):
            day_of_month = days_in_month
        else:
            day_of_month = 1

        if day_of_month > 0:
            daily_avg = used_kwh / max(day_of_month, 1)
            projected = round(daily_avg * days_in_month, 3)
        else:
            projected = 0

        is_over_threshold = used_percent >= budget["alert_threshold_percent"]
        estimated_cost = round(used_kwh * budget["price_per_kwh"], 2)

        return {
            "year_month": year_month,
            "budget_kwh": budget_kwh,
            "used_kwh": used_kwh,
            "used_percent": used_percent,
            "remaining_kwh": remaining_kwh,
            "projected_end_of_month_kwh": projected,
            "is_over_threshold": is_over_threshold,
            "estimated_cost": estimated_cost,
            "price_per_kwh": budget["price_per_kwh"],
            "alert_threshold_percent": budget["alert_threshold_percent"],
        }
    finally:
        await db.close()
