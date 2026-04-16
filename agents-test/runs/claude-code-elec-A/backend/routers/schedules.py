from datetime import datetime
from typing import Optional

import sqlalchemy
from fastapi import APIRouter, HTTPException, Query

from database import database
from models import schedules, devices
from schemas import ScheduleCreate, ScheduleUpdate, ScheduleOut

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


def _build_schedule_query():
    """Base query joining schedules with device info."""
    j = schedules.join(devices, schedules.c.device_id == devices.c.id)
    return sqlalchemy.select(
        schedules,
        devices.c.name.label("device_name"),
        devices.c.type.label("device_type"),
    ).select_from(j)


@router.get("/today", response_model=list[ScheduleOut])
async def today_schedules():
    today_dow = datetime.utcnow().weekday()  # Monday=0, Sunday=6
    query = (
        _build_schedule_query()
        .where(
            sqlalchemy.and_(
                schedules.c.day_of_week == today_dow,
                schedules.c.enabled == True,
            )
        )
        .order_by(schedules.c.start_time)
    )
    rows = await database.fetch_all(query)
    return [ScheduleOut(**dict(r._mapping)) for r in rows]


@router.get("", response_model=list[ScheduleOut])
async def list_schedules(
    device_id: Optional[int] = Query(None),
):
    query = _build_schedule_query()
    if device_id is not None:
        query = query.where(schedules.c.device_id == device_id)
    query = query.order_by(schedules.c.day_of_week, schedules.c.start_time)
    rows = await database.fetch_all(query)
    return [ScheduleOut(**dict(r._mapping)) for r in rows]


@router.post("", response_model=ScheduleOut, status_code=201)
async def create_schedule(payload: ScheduleCreate):
    # Verify device exists
    device = await database.fetch_one(
        devices.select().where(devices.c.id == payload.device_id)
    )
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    last_id = await database.execute(
        schedules.insert().values(
            device_id=payload.device_id,
            day_of_week=payload.day_of_week,
            start_time=payload.start_time,
            end_time=payload.end_time,
            enabled=True,
        )
    )

    row = await database.fetch_one(
        _build_schedule_query().where(schedules.c.id == last_id)
    )
    return ScheduleOut(**dict(row._mapping))


@router.put("/{schedule_id}", response_model=ScheduleOut)
async def update_schedule(schedule_id: int, payload: ScheduleUpdate):
    existing = await database.fetch_one(
        schedules.select().where(schedules.c.id == schedule_id)
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    # If device_id is being changed, verify it exists
    if "device_id" in update_data:
        device = await database.fetch_one(
            devices.select().where(devices.c.id == update_data["device_id"])
        )
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

    await database.execute(
        schedules.update().where(schedules.c.id == schedule_id).values(**update_data)
    )
    row = await database.fetch_one(
        _build_schedule_query().where(schedules.c.id == schedule_id)
    )
    return ScheduleOut(**dict(row._mapping))


@router.delete("/{schedule_id}", status_code=200)
async def delete_schedule(schedule_id: int):
    existing = await database.fetch_one(
        schedules.select().where(schedules.c.id == schedule_id)
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await database.execute(
        schedules.delete().where(schedules.c.id == schedule_id)
    )
    return {"detail": "Schedule deleted"}
