from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_db
from models import DeviceCreate, DeviceUpdate, DeviceResponse

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=list[DeviceResponse])
async def list_devices(
    type: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
):
    db = await get_db()
    try:
        query = "SELECT * FROM devices WHERE is_active = 1"
        params: list = []
        if type:
            query += " AND type = ?"
            params.append(type)
        if location:
            query += " AND location = ?"
            params.append(location)
        query += " ORDER BY name"
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=DeviceResponse, status_code=201)
async def create_device(device: DeviceCreate):
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO devices (name, type, wattage, location) VALUES (?, ?, ?, ?)",
            (device.name, device.type, device.wattage, device.location),
        )
        await db.commit()
        device_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.get("/{device_id}")
async def get_device(device_id: int):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Device not found")
        device = dict(row)

        cursor = await db.execute(
            "SELECT * FROM consumption_logs WHERE device_id = ? ORDER BY started_at DESC LIMIT 10",
            (device_id,),
        )
        logs = [dict(r) for r in await cursor.fetchall()]
        device["recent_consumption"] = logs
        return device
    finally:
        await db.close()


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(device_id: int, device: DeviceUpdate):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Device not found")

        updates = device.model_dump(exclude_none=True)
        if not updates:
            return dict(existing)

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [device_id]
        await db.execute(f"UPDATE devices SET {set_clause} WHERE id = ?", values)
        await db.commit()

        cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.delete("/{device_id}", status_code=200)
async def delete_device(device_id: int):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Device not found")

        # Soft delete
        await db.execute("UPDATE devices SET is_active = 0 WHERE id = ?", (device_id,))
        await db.commit()
        return {"message": "Device deactivated", "id": device_id}
    finally:
        await db.close()
