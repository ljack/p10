from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from database import database
from models import devices, consumption_logs
from schemas import DeviceCreate, DeviceUpdate, DeviceOut, DeviceDetail

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=list[DeviceOut])
async def list_devices(
    type: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
):
    query = devices.select()
    if not include_inactive:
        query = query.where(devices.c.is_active == True)
    if type:
        query = query.where(devices.c.type == type)
    if location:
        query = query.where(devices.c.location == location)
    query = query.order_by(devices.c.name)
    rows = await database.fetch_all(query)
    return [DeviceOut(**dict(r._mapping)) for r in rows]


@router.post("", response_model=DeviceOut, status_code=201)
async def create_device(payload: DeviceCreate):
    insert_query = devices.insert().values(
        name=payload.name,
        type=payload.type,
        wattage=payload.wattage,
        location=payload.location,
        is_active=True,
    )
    last_id = await database.execute(insert_query)
    row = await database.fetch_one(devices.select().where(devices.c.id == last_id))
    return DeviceOut(**dict(row._mapping))


@router.get("/{device_id}", response_model=DeviceDetail)
async def get_device(device_id: int):
    row = await database.fetch_one(
        devices.select().where(devices.c.id == device_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Device not found")

    logs_query = (
        consumption_logs.select()
        .where(consumption_logs.c.device_id == device_id)
        .order_by(consumption_logs.c.started_at.desc())
        .limit(10)
    )
    logs = await database.fetch_all(logs_query)
    recent = [dict(l._mapping) for l in logs]

    return DeviceDetail(**dict(row._mapping), recent_consumption=recent)


@router.put("/{device_id}", response_model=DeviceOut)
async def update_device(device_id: int, payload: DeviceUpdate):
    existing = await database.fetch_one(
        devices.select().where(devices.c.id == device_id)
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Device not found")

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    await database.execute(
        devices.update().where(devices.c.id == device_id).values(**update_data)
    )
    row = await database.fetch_one(devices.select().where(devices.c.id == device_id))
    return DeviceOut(**dict(row._mapping))


@router.delete("/{device_id}", status_code=200)
async def delete_device(device_id: int):
    """Soft delete: set is_active=false."""
    existing = await database.fetch_one(
        devices.select().where(devices.c.id == device_id)
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Device not found")

    await database.execute(
        devices.update().where(devices.c.id == device_id).values(is_active=False)
    )
    return {"detail": "Device deactivated"}
