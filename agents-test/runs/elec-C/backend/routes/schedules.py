from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
from models import Schedule, ScheduleCreate, ScheduleUpdate
from database import get_db

router = APIRouter(prefix="/api/schedules", tags=["schedules"])

@router.get("")
async def list_schedules(device_id: Optional[int] = Query(None)):
    """List all schedules, optionally filtered by device."""
    db = await get_db()
    try:
        query = "SELECT * FROM schedules WHERE 1=1"
        params = []
        
        if device_id:
            query += " AND device_id = ?"
            params.append(device_id)
        
        query += " ORDER BY day_of_week, start_time"
        
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        
        schedules = [dict(row) for row in rows]
        return {"schedules": schedules}
    finally:
        await db.close()

@router.post("")
async def create_schedule(schedule: ScheduleCreate):
    """Create a new schedule."""
    db = await get_db()
    try:
        # Verify device exists
        cursor = await db.execute("SELECT * FROM devices WHERE id = ? AND is_active = 1", (schedule.device_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Device not found or inactive")
        
        cursor = await db.execute(
            "INSERT INTO schedules (device_id, day_of_week, start_time, end_time, enabled) VALUES (?, ?, ?, ?, ?)",
            (schedule.device_id, schedule.day_of_week, schedule.start_time, schedule.end_time, schedule.enabled)
        )
        await db.commit()
        
        schedule_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        row = await cursor.fetchone()
        
        return dict(row)
    finally:
        await db.close()

@router.put("/{schedule_id}")
async def update_schedule(schedule_id: int, schedule: ScheduleUpdate):
    """Update a schedule."""
    db = await get_db()
    try:
        # Check if schedule exists
        cursor = await db.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Build update query
        updates = []
        params = []
        
        if schedule.day_of_week is not None:
            updates.append("day_of_week = ?")
            params.append(schedule.day_of_week)
        
        if schedule.start_time is not None:
            updates.append("start_time = ?")
            params.append(schedule.start_time)
        
        if schedule.end_time is not None:
            updates.append("end_time = ?")
            params.append(schedule.end_time)
        
        if schedule.enabled is not None:
            updates.append("enabled = ?")
            params.append(schedule.enabled)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        query = f"UPDATE schedules SET {', '.join(updates)} WHERE id = ?"
        params.append(schedule_id)
        
        await db.execute(query, params)
        await db.commit()
        
        # Return updated schedule
        cursor = await db.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        row = await cursor.fetchone()
        
        return dict(row)
    finally:
        await db.close()

@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: int):
    """Delete a schedule."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        await db.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
        await db.commit()
        
        return {"message": "Schedule deleted successfully"}
    finally:
        await db.close()

@router.get("/today")
async def get_today_schedules():
    """Get today's active schedules with device info."""
    db = await get_db()
    try:
        # Get current day of week (0 = Monday)
        today = datetime.now().weekday()
        
        cursor = await db.execute(
            """
            SELECT s.*, d.name as device_name, d.type as device_type, d.wattage
            FROM schedules s
            JOIN devices d ON s.device_id = d.id
            WHERE s.day_of_week = ? AND s.enabled = 1 AND d.is_active = 1
            ORDER BY s.start_time
            """,
            (today,)
        )
        rows = await cursor.fetchall()
        
        schedules = [dict(row) for row in rows]
        return {"schedules": schedules}
    finally:
        await db.close()
