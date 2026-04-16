from __future__ import annotations

from datetime import date, datetime, time, timedelta


CLINIC_OPEN = time(hour=8, minute=0)
CLINIC_CLOSE = time(hour=17, minute=0)
SLOT_INCREMENT = timedelta(minutes=15)


def day_bounds(target_date: date) -> tuple[datetime, datetime]:
    start = datetime.combine(target_date, time.min)
    end = start + timedelta(days=1)
    return start, end


def clinic_bounds(target_date: date) -> tuple[datetime, datetime]:
    return (
        datetime.combine(target_date, CLINIC_OPEN),
        datetime.combine(target_date, CLINIC_CLOSE),
    )


def is_clinic_day(target_date: date) -> bool:
    return target_date.weekday() < 5


def appointment_end(start: datetime, duration_minutes: int) -> datetime:
    return start + timedelta(minutes=duration_minutes)


def is_within_clinic_hours(start: datetime, duration_minutes: int) -> bool:
    clinic_start, clinic_end = clinic_bounds(start.date())
    candidate_end = appointment_end(start, duration_minutes)
    return clinic_start <= start and candidate_end <= clinic_end


def overlaps(
    *,
    candidate_start: datetime,
    candidate_end: datetime,
    existing_start: datetime,
    existing_end: datetime,
) -> bool:
    return candidate_start < existing_end and candidate_end > existing_start


def generate_slot_windows(target_date: date, duration_minutes: int) -> list[tuple[datetime, datetime]]:
    clinic_start, clinic_end = clinic_bounds(target_date)
    slots: list[tuple[datetime, datetime]] = []
    candidate_start = clinic_start

    while appointment_end(candidate_start, duration_minutes) <= clinic_end:
        slots.append((candidate_start, appointment_end(candidate_start, duration_minutes)))
        candidate_start += SLOT_INCREMENT

    return slots
