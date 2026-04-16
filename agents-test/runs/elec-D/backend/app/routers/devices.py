"""Device endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from databases import Database
from app.database import get_database
from app.schemas import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceDetailResponse
from app.models import Device

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    device: DeviceCreate,
    db: Database = Depends(get_database)
):
    """Create a new device."""
    query = """
        INSERT INTO devices (name, type, wattage, location, is_active, created_at)
        VALUES (:name, :type, :wattage, :location, :is_active, :created_at)
    """
    from datetime import datetime
    
    values = {
        "name": device.name,
        "type": device.type,
        "wattage": device.wattage,
        "location": device.location,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    device_id = await db.execute(query=query, values=values)
    
    # Fetch the created device
    select_query = "SELECT * FROM devices WHERE id = :id"
    result = await db.fetch_one(query=select_query, values={"id": device_id})
    
    return dict(result)


@router.get("", response_model=list[DeviceResponse])
async def list_devices(
    type: Optional[str] = None,
    location: Optional[str] = None,
    db: Database = Depends(get_database)
):
    """List all active devices with optional filters."""
    query = "SELECT * FROM devices WHERE is_active = :is_active"
    values = {"is_active": True}
    
    if type:
        query += " AND type = :type"
        values["type"] = type
    
    if location:
        query += " AND location = :location"
        values["location"] = location
    
    results = await db.fetch_all(query=query, values=values)
    
    return [dict(row) for row in results]


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: int,
    db: Database = Depends(get_database)
):
    """Get a device by ID."""
    query = "SELECT * FROM devices WHERE id = :id"
    result = await db.fetch_one(query=query, values={"id": device_id})
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with id {device_id} not found"
        )
    
    return dict(result)


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    device: DeviceUpdate,
    db: Database = Depends(get_database)
):
    """Update a device."""
    # Check if device exists
    check_query = "SELECT id FROM devices WHERE id = :id"
    exists = await db.fetch_one(query=check_query, values={"id": device_id})
    
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with id {device_id} not found"
        )
    
    # Update the device
    query = """
        UPDATE devices
        SET name = :name, type = :type, wattage = :wattage, location = :location
        WHERE id = :id
    """
    values = {
        "id": device_id,
        "name": device.name,
        "type": device.type,
        "wattage": device.wattage,
        "location": device.location
    }
    
    await db.execute(query=query, values=values)
    
    # Fetch the updated device
    select_query = "SELECT * FROM devices WHERE id = :id"
    result = await db.fetch_one(query=select_query, values={"id": device_id})
    
    return dict(result)


@router.delete("/{device_id}")
async def delete_device(
    device_id: int,
    db: Database = Depends(get_database)
):
    """Soft-delete a device (set is_active to false)."""
    # Check if device exists
    check_query = "SELECT id FROM devices WHERE id = :id"
    exists = await db.fetch_one(query=check_query, values={"id": device_id})
    
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with id {device_id} not found"
        )
    
    # Soft delete the device
    query = "UPDATE devices SET is_active = :is_active WHERE id = :id"
    await db.execute(query=query, values={"id": device_id, "is_active": False})
    
    return {"detail": "Device deleted successfully"}
