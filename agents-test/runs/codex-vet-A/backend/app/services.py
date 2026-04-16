from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .database import AsyncSessionLocal, Base, engine
from .models import Appointment, AppointmentStatus, Pet, Treatment
from .scheduling import (
    appointment_end,
    day_bounds,
    generate_slot_windows,
    is_clinic_day,
    is_within_clinic_hours,
    overlaps,
)
from .schemas import AppointmentCreate, AppointmentUpdate, PetCreate, PetUpdate, TreatmentCreate, TreatmentUpdate


SEEDED_TREATMENTS = (
    Treatment(
        name="Vaccination",
        duration_minutes=20,
        description="Routine vaccination visit with a quick wellness check.",
        price=Decimal("49.00"),
    ),
    Treatment(
        name="Dental cleaning",
        duration_minutes=60,
        description="Professional teeth cleaning and oral health assessment.",
        price=Decimal("165.00"),
    ),
    Treatment(
        name="X-ray",
        duration_minutes=45,
        description="Diagnostic imaging for injury or internal concerns.",
        price=Decimal("120.00"),
    ),
    Treatment(
        name="Annual exam",
        duration_minutes=30,
        description="Full yearly wellness exam including recommendations.",
        price=Decimal("72.00"),
    ),
    Treatment(
        name="Nail trim",
        duration_minutes=15,
        description="Quick grooming support for pets who need a tidy-up.",
        price=Decimal("28.00"),
    ),
)


def appointment_statement():
    return select(Appointment).options(
        selectinload(Appointment.pet),
        selectinload(Appointment.treatment),
    )


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        existing_treatments = await session.scalar(select(func.count(Treatment.id)))
        if existing_treatments:
            return

        session.add_all(SEEDED_TREATMENTS)
        await session.commit()


async def get_pet_or_404(session: AsyncSession, pet_id: int) -> Pet:
    pet = await session.get(Pet, pet_id)
    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found.")
    return pet


async def get_treatment_or_404(session: AsyncSession, treatment_id: int) -> Treatment:
    treatment = await session.get(Treatment, treatment_id)
    if treatment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment not found.")
    return treatment


async def get_appointment_or_404(session: AsyncSession, appointment_id: int) -> Appointment:
    appointment = await session.scalar(
        appointment_statement().where(Appointment.id == appointment_id)
    )
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    return appointment


async def list_pets(session: AsyncSession, owner_name: str | None = None) -> list[Pet]:
    statement = select(Pet).order_by(Pet.name.asc())
    if owner_name:
        search = f"%{owner_name.strip().lower()}%"
        statement = statement.where(func.lower(Pet.owner_name).like(search))

    return list((await session.scalars(statement)).all())


async def create_pet(session: AsyncSession, payload: PetCreate) -> Pet:
    pet = Pet(**payload.model_dump())
    session.add(pet)
    await session.commit()
    await session.refresh(pet)
    return pet


async def update_pet(session: AsyncSession, pet_id: int, payload: PetUpdate) -> Pet:
    pet = await get_pet_or_404(session, pet_id)
    for field, value in payload.model_dump().items():
        setattr(pet, field, value)

    await session.commit()
    await session.refresh(pet)
    return pet


async def delete_pet(session: AsyncSession, pet_id: int) -> None:
    pet = await get_pet_or_404(session, pet_id)
    appointment_count = await session.scalar(
        select(func.count(Appointment.id)).where(Appointment.pet_id == pet_id)
    )
    if appointment_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a pet that has appointment history.",
        )

    await session.delete(pet)
    await session.commit()


async def list_treatments(session: AsyncSession) -> list[Treatment]:
    statement = select(Treatment).order_by(Treatment.name.asc())
    return list((await session.scalars(statement)).all())


async def create_treatment(session: AsyncSession, payload: TreatmentCreate) -> Treatment:
    treatment = Treatment(
        **payload.model_dump(exclude={"price"}),
        price=Decimal(f"{payload.price:.2f}"),
    )
    session.add(treatment)
    await session.commit()
    await session.refresh(treatment)
    return treatment


async def update_treatment(
    session: AsyncSession,
    treatment_id: int,
    payload: TreatmentUpdate,
) -> Treatment:
    treatment = await get_treatment_or_404(session, treatment_id)
    for field, value in payload.model_dump(exclude={"price"}).items():
        setattr(treatment, field, value)
    treatment.price = Decimal(f"{payload.price:.2f}")

    await session.commit()
    await session.refresh(treatment)
    return treatment


async def delete_treatment(session: AsyncSession, treatment_id: int) -> None:
    treatment = await get_treatment_or_404(session, treatment_id)
    appointment_count = await session.scalar(
        select(func.count(Appointment.id)).where(Appointment.treatment_id == treatment_id)
    )
    if appointment_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a treatment that has appointment history.",
        )

    await session.delete(treatment)
    await session.commit()


async def list_appointments(
    session: AsyncSession,
    *,
    target_date: date | None = None,
    pet_id: int | None = None,
    status_filter: AppointmentStatus | None = None,
) -> list[Appointment]:
    statement = appointment_statement().order_by(Appointment.scheduled_at.asc())

    if target_date:
        start, end = day_bounds(target_date)
        statement = statement.where(
            Appointment.scheduled_at >= start,
            Appointment.scheduled_at < end,
        )

    if pet_id:
        statement = statement.where(Appointment.pet_id == pet_id)

    if status_filter:
        statement = statement.where(Appointment.status == status_filter)

    return list((await session.scalars(statement)).all())


async def active_appointments_for_day(
    session: AsyncSession,
    *,
    target_date: date,
    exclude_appointment_id: int | None = None,
) -> list[Appointment]:
    start, end = day_bounds(target_date)
    statement = (
        appointment_statement()
        .where(
            Appointment.scheduled_at >= start,
            Appointment.scheduled_at < end,
            Appointment.status != AppointmentStatus.cancelled,
        )
        .order_by(Appointment.scheduled_at.asc())
    )

    if exclude_appointment_id is not None:
        statement = statement.where(Appointment.id != exclude_appointment_id)

    return list((await session.scalars(statement)).all())


def ensure_naive_datetime(value: datetime) -> datetime:
    if value.tzinfo is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scheduled_at must be a local datetime without timezone information.",
        )
    return value.replace(second=0, microsecond=0)


async def validate_appointment_window(
    session: AsyncSession,
    *,
    scheduled_at: datetime,
    duration_minutes: int,
    exclude_appointment_id: int | None = None,
) -> None:
    if not is_clinic_day(scheduled_at.date()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointments can only be scheduled Monday through Friday.",
        )

    if not is_within_clinic_hours(scheduled_at, duration_minutes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointments must stay within clinic hours of 08:00 to 17:00.",
        )

    candidate_end = appointment_end(scheduled_at, duration_minutes)
    existing_appointments = await active_appointments_for_day(
        session,
        target_date=scheduled_at.date(),
        exclude_appointment_id=exclude_appointment_id,
    )

    for existing in existing_appointments:
        existing_end = appointment_end(existing.scheduled_at, existing.treatment.duration_minutes)
        if overlaps(
            candidate_start=scheduled_at,
            candidate_end=candidate_end,
            existing_start=existing.scheduled_at,
            existing_end=existing_end,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "This time slot overlaps with another appointment. "
                    "Please choose a different time."
                ),
            )


async def create_appointment(session: AsyncSession, payload: AppointmentCreate) -> Appointment:
    scheduled_at = ensure_naive_datetime(payload.scheduled_at)
    await get_pet_or_404(session, payload.pet_id)
    treatment = await get_treatment_or_404(session, payload.treatment_id)

    if payload.status != AppointmentStatus.cancelled:
        await validate_appointment_window(
            session,
            scheduled_at=scheduled_at,
            duration_minutes=treatment.duration_minutes,
        )

    appointment = Appointment(
        pet_id=payload.pet_id,
        treatment_id=payload.treatment_id,
        scheduled_at=scheduled_at,
        status=payload.status,
        notes=payload.notes,
    )
    session.add(appointment)
    await session.commit()
    return await get_appointment_or_404(session, appointment.id)


async def update_appointment(
    session: AsyncSession,
    appointment_id: int,
    payload: AppointmentUpdate,
) -> Appointment:
    appointment = await get_appointment_or_404(session, appointment_id)
    scheduled_at = ensure_naive_datetime(payload.scheduled_at)
    await get_pet_or_404(session, payload.pet_id)
    treatment = await get_treatment_or_404(session, payload.treatment_id)

    if payload.status != AppointmentStatus.cancelled:
        await validate_appointment_window(
            session,
            scheduled_at=scheduled_at,
            duration_minutes=treatment.duration_minutes,
            exclude_appointment_id=appointment_id,
        )

    appointment.pet_id = payload.pet_id
    appointment.treatment_id = payload.treatment_id
    appointment.scheduled_at = scheduled_at
    appointment.status = payload.status
    appointment.notes = payload.notes

    await session.commit()
    return await get_appointment_or_404(session, appointment_id)


async def cancel_appointment(session: AsyncSession, appointment_id: int) -> None:
    appointment = await get_appointment_or_404(session, appointment_id)
    appointment.status = AppointmentStatus.cancelled
    await session.commit()


async def available_slots(
    session: AsyncSession,
    *,
    target_date: date,
    treatment_id: int,
) -> dict[str, object]:
    treatment = await get_treatment_or_404(session, treatment_id)

    if not is_clinic_day(target_date):
        return {
            "date": target_date,
            "treatment_id": treatment_id,
            "duration_minutes": treatment.duration_minutes,
            "slots": [],
        }

    existing_appointments = await active_appointments_for_day(session, target_date=target_date)
    candidate_slots = generate_slot_windows(target_date, treatment.duration_minutes)
    free_slots: list[dict[str, datetime]] = []

    for start, end in candidate_slots:
        has_overlap = False
        for existing in existing_appointments:
            existing_end = appointment_end(existing.scheduled_at, existing.treatment.duration_minutes)
            if overlaps(
                candidate_start=start,
                candidate_end=end,
                existing_start=existing.scheduled_at,
                existing_end=existing_end,
            ):
                has_overlap = True
                break

        if not has_overlap:
            free_slots.append({"start": start, "end": end})

    return {
        "date": target_date,
        "treatment_id": treatment_id,
        "duration_minutes": treatment.duration_minutes,
        "slots": free_slots,
    }
