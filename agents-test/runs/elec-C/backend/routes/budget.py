from fastapi import APIRouter, HTTPException
from datetime import datetime
from models import Budget, BudgetCreate, BudgetUpdate
from database import get_db

router = APIRouter(prefix="/api/budget", tags=["budget"])

@router.get("")
async def list_budgets():
    """List all budgets."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM budgets ORDER BY year_month DESC")
        rows = await cursor.fetchall()
        
        budgets = [dict(row) for row in rows]
        return {"budgets": budgets}
    finally:
        await db.close()

@router.post("")
async def create_budget(budget: BudgetCreate):
    """Create a new budget for a month."""
    db = await get_db()
    try:
        # Check if budget already exists for this month
        cursor = await db.execute("SELECT * FROM budgets WHERE year_month = ?", (budget.year_month,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Budget for this month already exists")
        
        cursor = await db.execute(
            "INSERT INTO budgets (year_month, budget_kwh, price_per_kwh, alert_threshold_percent) VALUES (?, ?, ?, ?)",
            (budget.year_month, budget.budget_kwh, budget.price_per_kwh, budget.alert_threshold_percent)
        )
        await db.commit()
        
        budget_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM budgets WHERE id = ?", (budget_id,))
        row = await cursor.fetchone()
        
        return dict(row)
    finally:
        await db.close()

@router.get("/{year_month}")
async def get_budget(year_month: str):
    """Get budget and current usage for a specific month."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM budgets WHERE year_month = ?", (year_month,))
        row = await cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        budget = dict(row)
        
        # Get consumption for this month
        cursor = await db.execute(
            "SELECT SUM(kwh) as used_kwh FROM consumption_logs WHERE strftime('%Y-%m', started_at) = ?",
            (year_month,)
        )
        usage_row = await cursor.fetchone()
        budget["used_kwh"] = usage_row["used_kwh"] or 0
        
        return budget
    finally:
        await db.close()

@router.put("/{year_month}")
async def update_budget(year_month: str, budget: BudgetUpdate):
    """Update a budget."""
    db = await get_db()
    try:
        # Check if budget exists
        cursor = await db.execute("SELECT * FROM budgets WHERE year_month = ?", (year_month,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Budget not found")
        
        # Build update query
        updates = []
        params = []
        
        if budget.budget_kwh is not None:
            updates.append("budget_kwh = ?")
            params.append(budget.budget_kwh)
        
        if budget.price_per_kwh is not None:
            updates.append("price_per_kwh = ?")
            params.append(budget.price_per_kwh)
        
        if budget.alert_threshold_percent is not None:
            updates.append("alert_threshold_percent = ?")
            params.append(budget.alert_threshold_percent)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        query = f"UPDATE budgets SET {', '.join(updates)} WHERE year_month = ?"
        params.append(year_month)
        
        await db.execute(query, params)
        await db.commit()
        
        # Return updated budget
        cursor = await db.execute("SELECT * FROM budgets WHERE year_month = ?", (year_month,))
        row = await cursor.fetchone()
        
        return dict(row)
    finally:
        await db.close()

@router.get("/{year_month}/status")
async def get_budget_status(year_month: str):
    """Get detailed budget status with projections."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM budgets WHERE year_month = ?", (year_month,))
        row = await cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        budget = dict(row)
        
        # Get consumption for this month
        cursor = await db.execute(
            "SELECT SUM(kwh) as used_kwh, COUNT(DISTINCT DATE(started_at)) as days_with_data FROM consumption_logs WHERE strftime('%Y-%m', started_at) = ?",
            (year_month,)
        )
        usage_row = await cursor.fetchone()
        used_kwh = usage_row["used_kwh"] or 0
        days_with_data = usage_row["days_with_data"] or 0
        
        # Calculate percentages and projections
        budget_kwh = budget["budget_kwh"]
        used_percent = (used_kwh / budget_kwh * 100) if budget_kwh > 0 else 0
        remaining_kwh = budget_kwh - used_kwh
        
        # Project end of month usage
        from datetime import datetime as dt
        import calendar
        
        year, month = map(int, year_month.split("-"))
        days_in_month = calendar.monthrange(year, month)[1]
        current_day = dt.now().day if year_month == dt.now().strftime("%Y-%m") else days_in_month
        
        if days_with_data > 0:
            avg_daily_kwh = used_kwh / days_with_data
            projected_kwh = avg_daily_kwh * days_in_month
        else:
            projected_kwh = 0
        
        is_over_threshold = used_percent >= budget["alert_threshold_percent"]
        estimated_cost = used_kwh * budget["price_per_kwh"]
        projected_cost = projected_kwh * budget["price_per_kwh"]
        
        return {
            "budget_kwh": budget_kwh,
            "used_kwh": round(used_kwh, 2),
            "used_percent": round(used_percent, 2),
            "remaining_kwh": round(remaining_kwh, 2),
            "projected_end_of_month_kwh": round(projected_kwh, 2),
            "is_over_threshold": is_over_threshold,
            "estimated_cost": round(estimated_cost, 2),
            "projected_cost": round(projected_cost, 2),
            "price_per_kwh": budget["price_per_kwh"],
            "alert_threshold_percent": budget["alert_threshold_percent"]
        }
    finally:
        await db.close()
