from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_db
from models import ConsumptionCreate, ConsumptionResponse

router = APIRouter(prefix="/api/consumption", tags=["consumption"])


@router.get("/stats")
async def get_stats(
    period: str = Query("month", pattern=r"^(day|week|month)$"),
    device_id: Optional[int] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
):
    db = await get_db()
    try:
        # Build date filter
        import datetime

        today = datetime.date.today()
        if from_date:
            start = from_date
        elif period == "day":
            start = today.isoformat()
        elif period == "week":
            start = (today - datetime.timedelta(days=today.weekday())).isoformat()
        else:  # month
            start = today.replace(day=1).isoformat()

        if to_date:
            end = to_date
        else:
            end = today.isoformat()

        query = """
            SELECT cl.*, d.name as device_name, d.type as device_type
            FROM consumption_logs cl
            JOIN devices d ON cl.device_id = d.id
            WHERE DATE(cl.started_at) >= ? AND DATE(cl.started_at) <= ?
        """
        params: list = [start, end]

        if device_id:
            query += " AND cl.device_id = ?"
            params.append(device_id)

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        logs = [dict(r) for r in rows]

        total_kwh = sum(l["kwh"] for l in logs)

        # Get price from budget for current month
        month_str = today.strftime("%Y-%m")
        cursor = await db.execute(
            "SELECT price_per_kwh FROM budgets WHERE year_month = ?", (month_str,)
        )
        budget_row = await cursor.fetchone()
        price = budget_row["price_per_kwh"] if budget_row else 0.15

        total_cost = total_kwh * price

        # Calculate days in range
        from datetime import date as date_type

        start_d = date_type.fromisoformat(start)
        end_d = date_type.fromisoformat(end)
        days = max((end_d - start_d).days, 1)
        avg_daily_kwh = round(total_kwh / days, 3)

        # By device breakdown
        by_device: dict = {}
        for l in logs:
            did = l["device_id"]
            if did not in by_device:
                by_device[did] = {
                    "device_id": did,
                    "device_name": l["device_name"],
                    "device_type": l["device_type"],
                    "total_kwh": 0,
                }
            by_device[did]["total_kwh"] += l["kwh"]
        for v in by_device.values():
            v["total_kwh"] = round(v["total_kwh"], 3)
            v["total_cost"] = round(v["total_kwh"] * price, 2)

        # By type breakdown
        by_type: dict = {}
        for l in logs:
            t = l["device_type"]
            if t not in by_type:
                by_type[t] = {"type": t, "total_kwh": 0}
            by_type[t]["total_kwh"] += l["kwh"]
        for v in by_type.values():
            v["total_kwh"] = round(v["total_kwh"], 3)
            v["total_cost"] = round(v["total_kwh"] * price, 2)

        return {
            "period": period,
            "from": start,
            "to": end,
            "total_kwh": round(total_kwh, 3),
            "total_cost": round(total_cost, 2),
            "avg_daily_kwh": avg_daily_kwh,
            "by_device": list(by_device.values()),
            "by_type": list(by_type.values()),
        }
    finally:
        await db.close()


@router.get("", response_model=list[ConsumptionResponse])
async def list_consumption(
    device_id: Optional[int] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
):
    db = await get_db()
    try:
        query = "SELECT * FROM consumption_logs WHERE 1=1"
        params: list = []
        if device_id:
            query += " AND device_id = ?"
            params.append(device_id)
        if from_date:
            query += " AND DATE(started_at) >= ?"
            params.append(from_date)
        if to_date:
            query += " AND DATE(started_at) <= ?"
            params.append(to_date)
        query += " ORDER BY started_at DESC LIMIT 200"

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=ConsumptionResponse, status_code=201)
async def create_consumption(entry: ConsumptionCreate):
    db = await get_db()
    try:
        # Get device to compute kwh
        cursor = await db.execute(
            "SELECT * FROM devices WHERE id = ?", (entry.device_id,)
        )
        device = await cursor.fetchone()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        kwh = round(device["wattage"] * entry.duration_minutes / 60 / 1000, 4)

        cursor = await db.execute(
            "INSERT INTO consumption_logs (device_id, started_at, duration_minutes, kwh) VALUES (?, ?, ?, ?)",
            (entry.device_id, entry.started_at, entry.duration_minutes, kwh),
        )
        await db.commit()
        log_id = cursor.lastrowid
        cursor = await db.execute(
            "SELECT * FROM consumption_logs WHERE id = ?", (log_id,)
        )
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()
