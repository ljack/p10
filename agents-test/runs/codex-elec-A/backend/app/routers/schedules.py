from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from ..database import get_session
from ..services import ensure_schedule_window


router = APIRouter(prefix="/schedules", tags=["schedules"])


async def require_active_device(session: AsyncSession, device_id: int) -> models.Device:
    device = await session.get(models.Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    if not device.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot schedule an inactive device")
    return device


def schedule_to_output(schedule: models.Schedule, device: models.Device) -> schemas.ScheduleOut:
    return schemas.ScheduleOut(
        id=schedule.id,
        device_id=schedule.device_id,
        day_of_week=schedule.day_of_week,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        enabled=schedule.enabled,
        device=schemas.DeviceMiniOut.model_validate(device),
    )


@router.get("", response_model=list[schemas.ScheduleOut])
async def list_schedules(
    device_id: int | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> list[schemas.ScheduleOut]:
    query = (
        select(models.Schedule, models.Device)
        .join(models.Device, models.Device.id == models.Schedule.device_id)
        .order_by(models.Schedule.day_of_week.asc(), models.Schedule.start_time.asc(), models.Device.name.asc())
    )
    if device_id is not None:
        query = query.where(models.Schedule.device_id == device_id)
    result = await session.execute(query)
    return [schedule_to_output(schedule, device) for schedule, device in result.all()]


@router.post("", response_model=schemas.ScheduleOut, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    payload: schemas.ScheduleCreate,
    session: AsyncSession = Depends(get_session),
) -> schemas.ScheduleOut:
    ensure_schedule_window(payload.start_time, payload.end_time)
    device = await require_active_device(session, payload.device_id)
    schedule = models.Schedule(**payload.model_dump())
    session.add(schedule)
    await session.commit()
    await session.refresh(schedule)
    return schedule_to_output(schedule, device)


@router.put("/{schedule_id}", response_model=schemas.ScheduleOut)
async def update_schedule(
    schedule_id: int,
    payload: schemas.ScheduleUpdate,
    session: AsyncSession = Depends(get_session),
) -> schemas.ScheduleOut:
    schedule = await session.get(models.Schedule, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    updates = payload.model_dump(exclude_unset=True)
    start_time = updates.get("start_time", schedule.start_time)
    end_time = updates.get("end_time", schedule.end_time)
    ensure_schedule_window(start_time, end_time)

    target_device_id = updates.get("device_id", schedule.device_id)
    device = await require_active_device(session, target_device_id)

    for field, value in updates.items():
        setattr(schedule, field, value)

    await session.commit()
    await session.refresh(schedule)
    return schedule_to_output(schedule, device)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(schedule_id: int, session: AsyncSession = Depends(get_session)) -> Response:
    schedule = await session.get(models.Schedule, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    await session.delete(schedule)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/today", response_model=list[schemas.ScheduleOut])
async def list_todays_schedules(session: AsyncSession = Depends(get_session)) -> list[schemas.ScheduleOut]:
    weekday = datetime.now().weekday()
    result = await session.execute(
        select(models.Schedule, models.Device)
        .join(models.Device, models.Device.id == models.Schedule.device_id)
        .where(
            models.Schedule.day_of_week == weekday,
            models.Schedule.enabled.is_(True),
            models.Device.is_active.is_(True),
        )
        .order_by(models.Schedule.start_time.asc())
    )
    return [schedule_to_output(schedule, device) for schedule, device in result.all()]
