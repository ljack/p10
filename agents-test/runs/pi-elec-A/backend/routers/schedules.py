from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_db
from models import ScheduleCreate, ScheduleUpdate, ScheduleResponse
import datetime

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("/today")
async def get_today_schedules():
    db = await get_db()
    try:
        today_dow = datetime.date.today().weekday()  # 0=Monday
        cursor = await db.execute(
            """
            SELECT s.*, d.name as device_name, d.type as device_type,
                   d.wattage, d.location
            FROM schedules s
            JOIN devices d ON s.device_id = d.id
            WHERE s.day_of_week = ? AND s.enabled = 1 AND d.is_active = 1
            ORDER BY s.start_time
            """,
            (today_dow,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(device_id: Optional[int] = Query(None)):
    db = await get_db()
    try:
        if device_id:
            cursor = await db.execute(
                "SELECT * FROM schedules WHERE device_id = ? ORDER BY day_of_week, start_time",
                (device_id,),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM schedules ORDER BY day_of_week, start_time"
            )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=ScheduleResponse, status_code=201)
async def create_schedule(schedule: ScheduleCreate):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM devices WHERE id = ?", (schedule.device_id,)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Device not found")

        cursor = await db.execute(
            "INSERT INTO schedules (device_id, day_of_week, start_time, end_time, enabled) VALUES (?, ?, ?, ?, ?)",
            (
                schedule.device_id,
                schedule.day_of_week,
                schedule.start_time,
                schedule.end_time,
                schedule.enabled,
            ),
        )
        await db.commit()
        sid = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM schedules WHERE id = ?", (sid,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(schedule_id: int, schedule: ScheduleUpdate):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM schedules WHERE id = ?", (schedule_id,)
        )
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Schedule not found")

        updates = schedule.model_dump(exclude_none=True)
        if not updates:
            return dict(existing)

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [schedule_id]
        await db.execute(f"UPDATE schedules SET {set_clause} WHERE id = ?", values)
        await db.commit()

        cursor = await db.execute(
            "SELECT * FROM schedules WHERE id = ?", (schedule_id,)
        )
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.delete("/{schedule_id}", status_code=200)
async def delete_schedule(schedule_id: int):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM schedules WHERE id = ?", (schedule_id,)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")

        await db.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
        await db.commit()
        return {"message": "Schedule deleted", "id": schedule_id}
    finally:
        await db.close()
