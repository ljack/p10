from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models import Device, DeviceCreate, DeviceUpdate
from database import get_db

router = APIRouter(prefix="/api/devices", tags=["devices"])

@router.get("")
async def list_devices(
    type: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
):
    """List all devices with optional filters."""
    db = await get_db()
    try:
        query = "SELECT * FROM devices WHERE is_active = 1"
        params = []
        
        if type:
            query += " AND type = ?"
            params.append(type)
        
        if location:
            query += " AND location = ?"
            params.append(location)
        
        query += " ORDER BY created_at DESC"
        
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        
        devices = [dict(row) for row in rows]
        return {"devices": devices}
    finally:
        await db.close()

@router.post("")
async def create_device(device: DeviceCreate):
    """Create a new device."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO devices (name, type, wattage, location) VALUES (?, ?, ?, ?)",
            (device.name, device.type, device.wattage, device.location)
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
    """Get device detail with recent consumption."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
        row = await cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Device not found")
        
        device = dict(row)
        
        # Get recent consumption (last 10 entries)
        cursor = await db.execute(
            "SELECT * FROM consumption_logs WHERE device_id = ? ORDER BY started_at DESC LIMIT 10",
            (device_id,)
        )
        logs = await cursor.fetchall()
        
        device["recent_consumption"] = [dict(log) for log in logs]
        
        return device
    finally:
        await db.close()

@router.put("/{device_id}")
async def update_device(device_id: int, device: DeviceUpdate):
    """Update a device."""
    db = await get_db()
    try:
        # Check if device exists
        cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Build update query
        updates = []
        params = []
        
        if device.name is not None:
            updates.append("name = ?")
            params.append(device.name)
        
        if device.type is not None:
            updates.append("type = ?")
            params.append(device.type)
        
        if device.wattage is not None:
            updates.append("wattage = ?")
            params.append(device.wattage)
        
        if device.location is not None:
            updates.append("location = ?")
            params.append(device.location)
        
        if device.is_active is not None:
            updates.append("is_active = ?")
            params.append(device.is_active)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        query = f"UPDATE devices SET {', '.join(updates)} WHERE id = ?"
        params.append(device_id)
        
        await db.execute(query, params)
        await db.commit()
        
        # Return updated device
        cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
        row = await cursor.fetchone()
        
        return dict(row)
    finally:
        await db.close()

@router.delete("/{device_id}")
async def delete_device(device_id: int):
    """Soft delete a device."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Device not found")
        
        await db.execute("UPDATE devices SET is_active = 0 WHERE id = ?", (device_id,))
        await db.commit()
        
        return {"message": "Device deleted successfully"}
    finally:
        await db.close()
