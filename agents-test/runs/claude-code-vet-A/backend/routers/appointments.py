from datetime import datetime, timedelta, time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Appointment, Pet, Treatment
from schemas import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    TimeSlot,
)

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

CLINIC_OPEN = time(8, 0)
CLINIC_CLOSE = time(17, 0)
SLOT_INCREMENT_MINUTES = 30


def validate_business_hours(scheduled_at: datetime, duration_minutes: int):
    if scheduled_at.weekday() >= 5:
        raise HTTPException(400, "Clinic is closed on weekends")
    if scheduled_at.time() < CLINIC_OPEN:
        raise HTTPException(400, "Before clinic opening hours (08:00)")
    end = scheduled_at + timedelta(minutes=duration_minutes)
    close_dt = scheduled_at.replace(
        hour=CLINIC_CLOSE.hour, minute=CLINIC_CLOSE.minute, second=0, microsecond=0
    )
    if end > close_dt:
        raise HTTPException(400, "Appointment would extend past closing time (17:00)")


async def check_overlap(
    db: AsyncSession,
    scheduled_at: datetime,
    duration_minutes: int,
    exclude_id: int | None = None,
) -> bool:
    new_end = scheduled_at + timedelta(minutes=duration_minutes)
    day_start = scheduled_at.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    query = (
        select(Appointment)
        .options(selectinload(Appointment.treatment))
        .where(
            Appointment.scheduled_at >= day_start,
            Appointment.scheduled_at < day_end,
            Appointment.status != "cancelled",
        )
    )
    if exclude_id:
        query = query.where(Appointment.id != exclude_id)

    result = await db.execute(query)
    for appt in result.scalars().all():
        existing_end = appt.scheduled_at + timedelta(
            minutes=appt.treatment.duration_minutes
        )
        if scheduled_at < existing_end and new_end > appt.scheduled_at:
            return True
    return False


@router.get("/available-slots", response_model=list[TimeSlot])
async def available_slots(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    treatment_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    target = datetime.strptime(date, "%Y-%m-%d").date()
    if target.weekday() >= 5:
        return []

    treatment = await db.get(Treatment, treatment_id)
    if not treatment:
        raise HTTPException(404, "Treatment not found")

    duration = timedelta(minutes=treatment.duration_minutes)
    day_start = datetime.combine(target, CLINIC_OPEN)
    day_end = datetime.combine(target, CLINIC_CLOSE)

    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.treatment))
        .where(
            Appointment.scheduled_at >= day_start,
            Appointment.scheduled_at < day_end,
            Appointment.status != "cancelled",
        )
    )
    busy: list[tuple[datetime, datetime]] = []
    for appt in result.scalars().all():
        s = appt.scheduled_at
        e = s + timedelta(minutes=appt.treatment.duration_minutes)
        busy.append((s, e))

    slots: list[TimeSlot] = []
    current = day_start
    while current + duration <= day_end:
        slot_end = current + duration
        if not any(current < be and slot_end > bs for bs, be in busy):
            slots.append(TimeSlot(start=current.isoformat(), end=slot_end.isoformat()))
        current += timedelta(minutes=SLOT_INCREMENT_MINUTES)

    return slots


@router.get("", response_model=list[AppointmentResponse])
async def list_appointments(
    date: str | None = None,
    pet_id: int | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Appointment).options(
        selectinload(Appointment.pet), selectinload(Appointment.treatment)
    )
    if date:
        target = datetime.strptime(date, "%Y-%m-%d").date()
        day_start = datetime.combine(target, time(0, 0))
        day_end = day_start + timedelta(days=1)
        query = query.where(
            Appointment.scheduled_at >= day_start,
            Appointment.scheduled_at < day_end,
        )
    if pet_id:
        query = query.where(Appointment.pet_id == pet_id)
    if status:
        query = query.where(Appointment.status == status)
    query = query.order_by(Appointment.scheduled_at)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate, db: AsyncSession = Depends(get_db)
):
    pet = await db.get(Pet, data.pet_id)
    if not pet:
        raise HTTPException(404, "Pet not found")
    treatment = await db.get(Treatment, data.treatment_id)
    if not treatment:
        raise HTTPException(404, "Treatment not found")

    validate_business_hours(data.scheduled_at, treatment.duration_minutes)

    if await check_overlap(db, data.scheduled_at, treatment.duration_minutes):
        raise HTTPException(409, "Time slot conflicts with an existing appointment")

    appt = Appointment(**data.model_dump())
    db.add(appt)
    await db.commit()
    await db.refresh(appt, ["pet", "treatment"])
    return appt


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.pet), selectinload(Appointment.treatment))
        .where(Appointment.id == appointment_id)
    )
    appt = result.scalars().first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    return appt


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.pet), selectinload(Appointment.treatment))
        .where(Appointment.id == appointment_id)
    )
    appt = result.scalars().first()
    if not appt:
        raise HTTPException(404, "Appointment not found")

    updates = data.model_dump(exclude_unset=True)

    if "pet_id" in updates:
        if not await db.get(Pet, updates["pet_id"]):
            raise HTTPException(404, "Pet not found")

    treatment_id = updates.get("treatment_id", appt.treatment_id)
    treatment = await db.get(Treatment, treatment_id)
    if not treatment:
        raise HTTPException(404, "Treatment not found")

    scheduled_at = updates.get("scheduled_at", appt.scheduled_at)
    new_status = updates.get("status", appt.status)

    if "scheduled_at" in updates or "treatment_id" in updates:
        if new_status != "cancelled":
            validate_business_hours(scheduled_at, treatment.duration_minutes)
            if await check_overlap(
                db, scheduled_at, treatment.duration_minutes, exclude_id=appt.id
            ):
                raise HTTPException(
                    409, "Time slot conflicts with an existing appointment"
                )

    for key, val in updates.items():
        setattr(appt, key, val)

    await db.commit()
    await db.refresh(appt, ["pet", "treatment"])
    return appt


@router.delete("/{appointment_id}", status_code=204)
async def cancel_appointment(appointment_id: int, db: AsyncSession = Depends(get_db)):
    appt = await db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    appt.status = "cancelled"
    await db.commit()
