from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
from models import ConsumptionCreate, ConsumptionLog
from database import get_db

router = APIRouter(prefix="/api/consumption", tags=["consumption"])

@router.post("")
async def create_consumption(log: ConsumptionCreate):
    """Log a new consumption entry."""
    db = await get_db()
    try:
        # Get device to calculate kWh
        cursor = await db.execute("SELECT wattage FROM devices WHERE id = ? AND is_active = 1", (log.device_id,))
        device = await cursor.fetchone()
        
        if not device:
            raise HTTPException(status_code=404, detail="Device not found or inactive")
        
        # Calculate kWh
        kwh = (device["wattage"] * log.duration_minutes) / 60 / 1000
        
        cursor = await db.execute(
            "INSERT INTO consumption_logs (device_id, started_at, duration_minutes, kwh) VALUES (?, ?, ?, ?)",
            (log.device_id, log.started_at.isoformat(), log.duration_minutes, kwh)
        )
        await db.commit()
        
        log_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM consumption_logs WHERE id = ?", (log_id,))
        row = await cursor.fetchone()
        
        return dict(row)
    finally:
        await db.close()

@router.get("")
async def list_consumption(
    device_id: Optional[int] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    """List consumption logs with filters."""
    db = await get_db()
    try:
        query = "SELECT * FROM consumption_logs WHERE 1=1"
        params = []
        
        if device_id:
            query += " AND device_id = ?"
            params.append(device_id)
        
        if from_date:
            query += " AND DATE(started_at) >= ?"
            params.append(from_date)
        
        if to_date:
            query += " AND DATE(started_at) <= ?"
            params.append(to_date)
        
        query += " ORDER BY started_at DESC"
        
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        
        logs = [dict(row) for row in rows]
        return {"logs": logs}
    finally:
        await db.close()

@router.get("/stats")
async def get_stats(
    period: str = Query("month"),
    device_id: Optional[int] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    """Get aggregated consumption statistics."""
    db = await get_db()
    try:
        # Build base query with date filtering
        query_base = "FROM consumption_logs WHERE 1=1"
        params = []
        
        if device_id:
            query_base += " AND device_id = ?"
            params.append(device_id)
        
        # Set date range based on period if not explicitly provided
        if not from_date and not to_date:
            if period == "day":
                from_date = datetime.now().strftime("%Y-%m-%d")
                to_date = from_date
            elif period == "week":
                from datetime import timedelta
                end = datetime.now()
                start = end - timedelta(days=7)
                from_date = start.strftime("%Y-%m-%d")
                to_date = end.strftime("%Y-%m-%d")
            elif period == "month":
                from_date = datetime.now().strftime("%Y-%m-01")
                to_date = datetime.now().strftime("%Y-%m-%d")
        
        if from_date:
            query_base += " AND DATE(started_at) >= ?"
            params.append(from_date)
        
        if to_date:
            query_base += " AND DATE(started_at) <= ?"
            params.append(to_date)
        
        # Total kWh
        cursor = await db.execute(f"SELECT SUM(kwh) as total_kwh {query_base}", params)
        row = await cursor.fetchone()
        total_kwh = row["total_kwh"] or 0
        
        # Get price per kWh from current month budget
        current_month = datetime.now().strftime("%Y-%m")
        cursor = await db.execute("SELECT price_per_kwh FROM budgets WHERE year_month = ?", (current_month,))
        budget_row = await cursor.fetchone()
        price_per_kwh = budget_row["price_per_kwh"] if budget_row else 0.15
        
        total_cost = total_kwh * price_per_kwh
        
        # Average daily kWh
        if from_date and to_date:
            from datetime import datetime as dt
            days = (dt.strptime(to_date, "%Y-%m-%d") - dt.strptime(from_date, "%Y-%m-%d")).days + 1
        else:
            days = 1
        
        avg_daily_kwh = total_kwh / days if days > 0 else 0
        
        # By device breakdown
        cursor = await db.execute(
            f"""
            SELECT d.id, d.name, SUM(cl.kwh) as total_kwh
            FROM consumption_logs cl
            JOIN devices d ON cl.device_id = d.id
            WHERE 1=1 {query_base.replace('FROM consumption_logs WHERE 1=1', '')}
            GROUP BY d.id, d.name
            ORDER BY total_kwh DESC
            """,
            params
        )
        by_device = [dict(row) for row in await cursor.fetchall()]
        
        # By type breakdown
        cursor = await db.execute(
            f"""
            SELECT d.type, SUM(cl.kwh) as total_kwh
            FROM consumption_logs cl
            JOIN devices d ON cl.device_id = d.id
            WHERE 1=1 {query_base.replace('FROM consumption_logs WHERE 1=1', '')}
            GROUP BY d.type
            ORDER BY total_kwh DESC
            """,
            params
        )
        by_type = [dict(row) for row in await cursor.fetchall()]
        
        return {
            "total_kwh": round(total_kwh, 2),
            "total_cost": round(total_cost, 2),
            "avg_daily_kwh": round(avg_daily_kwh, 2),
            "by_device": by_device,
            "by_type": by_type
        }
    finally:
        await db.close()
