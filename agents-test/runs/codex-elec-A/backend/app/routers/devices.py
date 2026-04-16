from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from ..database import get_session
from ..services import as_utc, current_year_month, month_window


router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("", response_model=list[schemas.DeviceOut])
async def list_devices(
    device_type: schemas.DeviceType | None = Query(None, alias="type"),
    location: str | None = None,
    include_inactive: bool = False,
    session: AsyncSession = Depends(get_session),
) -> list[schemas.DeviceOut]:
    query = select(models.Device).order_by(models.Device.name.asc())
    if not include_inactive:
        query = query.where(models.Device.is_active.is_(True))
    if device_type:
        query = query.where(models.Device.type == device_type.value)
    if location:
        query = query.where(func.lower(models.Device.location).contains(location.strip().lower()))

    result = await session.execute(query)
    devices = list(result.scalars().all())
    if not devices:
        return []

    start, end, _ = month_window(current_year_month())
    usage_rows = await session.execute(
        select(models.ConsumptionLog.device_id, func.coalesce(func.sum(models.ConsumptionLog.kwh), 0.0))
        .where(
            models.ConsumptionLog.device_id.in_([device.id for device in devices]),
            models.ConsumptionLog.started_at >= start,
            models.ConsumptionLog.started_at < end,
        )
        .group_by(models.ConsumptionLog.device_id)
    )
    usage_lookup = {device_id: round(float(total), 3) for device_id, total in usage_rows.all()}

    return [
        schemas.DeviceOut(
            id=device.id,
            name=device.name,
            type=device.type,
            wattage=device.wattage,
            location=device.location,
            is_active=device.is_active,
            created_at=as_utc(device.created_at),
            current_month_kwh=usage_lookup.get(device.id, 0.0),
        )
        for device in devices
    ]


@router.post("", response_model=schemas.DeviceOut, status_code=status.HTTP_201_CREATED)
async def create_device(
    payload: schemas.DeviceCreate,
    session: AsyncSession = Depends(get_session),
) -> schemas.DeviceOut:
    device = models.Device(**payload.model_dump())
    session.add(device)
    await session.commit()
    await session.refresh(device)
    return schemas.DeviceOut.model_validate(device)


@router.get("/{device_id}", response_model=schemas.DeviceDetailOut)
async def get_device(device_id: int, session: AsyncSession = Depends(get_session)) -> schemas.DeviceDetailOut:
    device = await session.get(models.Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    recent_rows = await session.execute(
        select(models.ConsumptionLog)
        .where(models.ConsumptionLog.device_id == device_id)
        .order_by(models.ConsumptionLog.started_at.desc())
        .limit(10)
    )
    recent_logs = list(recent_rows.scalars().all())

    total_row = await session.execute(
        select(func.coalesce(func.sum(models.ConsumptionLog.kwh), 0.0)).where(models.ConsumptionLog.device_id == device_id)
    )
    total_consumption = round(float(total_row.scalar_one()), 3)

    start, end, _ = month_window(current_year_month())
    current_month_row = await session.execute(
        select(func.coalesce(func.sum(models.ConsumptionLog.kwh), 0.0)).where(
            models.ConsumptionLog.device_id == device_id,
            models.ConsumptionLog.started_at >= start,
            models.ConsumptionLog.started_at < end,
        )
    )
    current_month_kwh = round(float(current_month_row.scalar_one()), 3)

    return schemas.DeviceDetailOut(
        id=device.id,
        name=device.name,
        type=device.type,
        wattage=device.wattage,
        location=device.location,
        is_active=device.is_active,
        created_at=as_utc(device.created_at),
        current_month_kwh=current_month_kwh,
        total_consumption_kwh=total_consumption,
        recent_consumption=[
            schemas.ConsumptionSummaryOut(
                id=log.id,
                device_id=log.device_id,
                started_at=as_utc(log.started_at),
                duration_minutes=log.duration_minutes,
                kwh=round(float(log.kwh), 3),
                recorded_at=as_utc(log.recorded_at),
                estimated_cost=0.0,
            )
            for log in recent_logs
        ],
    )


@router.put("/{device_id}", response_model=schemas.DeviceOut)
async def update_device(
    device_id: int,
    payload: schemas.DeviceUpdate,
    session: AsyncSession = Depends(get_session),
) -> schemas.DeviceOut:
    device = await session.get(models.Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if isinstance(value, schemas.DeviceType):
            setattr(device, field, value.value)
        else:
            setattr(device, field, value)

    await session.commit()
    await session.refresh(device)
    return schemas.DeviceOut.model_validate(device)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(device_id: int, session: AsyncSession = Depends(get_session)) -> Response:
    device = await session.get(models.Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    device.is_active = False
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
