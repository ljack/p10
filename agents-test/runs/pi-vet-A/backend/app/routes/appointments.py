from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, date, timedelta
from ..models import (
    AppointmentCreate, AppointmentUpdate, AppointmentResponse, AvailableSlot
)
from ..database import get_db

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

CLINIC_OPEN = 8   # 08:00
CLINIC_CLOSE = 17  # 17:00
SLOT_INCREMENT = 15  # minutes


def _parse_dt(dt_str: str) -> datetime:
    """Parse ISO datetime string."""
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00").replace("+00:00", ""))


async def _check_overlap(db, scheduled_at: datetime, duration: int,
                          exclude_id: Optional[int] = None) -> bool:
    """Check if proposed time overlaps with existing appointments."""
    end_at = scheduled_at + timedelta(minutes=duration)

    query = """
        SELECT a.id, a.scheduled_at, t.duration_minutes
        FROM appointments a
        JOIN treatments t ON a.treatment_id = t.id
        WHERE a.status NOT IN ('cancelled')
          AND date(a.scheduled_at) = date(?)
    """
    params: list = [scheduled_at.isoformat()]

    if exclude_id:
        query += " AND a.id != ?"
        params.append(exclude_id)

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    for row in rows:
        existing_start = datetime.fromisoformat(row["scheduled_at"])
        existing_end = existing_start + timedelta(minutes=row["duration_minutes"])
        if scheduled_at < existing_end and end_at > existing_start:
            return True
    return False


def _validate_clinic_hours(scheduled_at: datetime, duration: int):
    """Validate appointment is within clinic hours and on a weekday."""
    if scheduled_at.weekday() >= 5:
        raise HTTPException(status_code=400, detail="Clinic is closed on weekends")

    start_hour = scheduled_at.hour + scheduled_at.minute / 60
    end_dt = scheduled_at + timedelta(minutes=duration)
    end_hour = end_dt.hour + end_dt.minute / 60

    if start_hour < CLINIC_OPEN or end_hour > CLINIC_CLOSE:
        raise HTTPException(
            status_code=400,
            detail=f"Appointment must be within clinic hours ({CLINIC_OPEN}:00–{CLINIC_CLOSE}:00)"
        )


@router.get("/available-slots", response_model=list[AvailableSlot])
async def available_slots(
    date_str: str = Query(..., alias="date"),
    treatment_id: int = Query(...),
):
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    if target_date.weekday() >= 5:
        return []

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM treatments WHERE id = ?", (treatment_id,)
        )
        treatment = await cursor.fetchone()
        if not treatment:
            raise HTTPException(status_code=404, detail="Treatment not found")

        duration = treatment["duration_minutes"]

        # Get existing appointments for the day
        cursor = await db.execute(
            """SELECT a.scheduled_at, t.duration_minutes
               FROM appointments a
               JOIN treatments t ON a.treatment_id = t.id
               WHERE date(a.scheduled_at) = ? AND a.status != 'cancelled'
               ORDER BY a.scheduled_at""",
            (target_date.isoformat(),),
        )
        existing = await cursor.fetchall()

        busy = []
        for row in existing:
            s = datetime.fromisoformat(row["scheduled_at"])
            e = s + timedelta(minutes=row["duration_minutes"])
            busy.append((s, e))

        # Generate available slots
        slots = []
        current = datetime(target_date.year, target_date.month, target_date.day, CLINIC_OPEN, 0)
        day_end = datetime(target_date.year, target_date.month, target_date.day, CLINIC_CLOSE, 0)

        while current + timedelta(minutes=duration) <= day_end:
            slot_end = current + timedelta(minutes=duration)
            overlaps = any(current < be and slot_end > bs for bs, be in busy)
            if not overlaps:
                slots.append(AvailableSlot(
                    start=current.strftime("%Y-%m-%dT%H:%M:%S"),
                    end=slot_end.strftime("%Y-%m-%dT%H:%M:%S"),
                ))
            current += timedelta(minutes=SLOT_INCREMENT)

        return slots
    finally:
        await db.close()


@router.get("", response_model=list[AppointmentResponse])
async def list_appointments(
    date_str: Optional[str] = Query(None, alias="date"),
    pet_id: Optional[int] = None,
    status: Optional[str] = None,
):
    db = await get_db()
    try:
        query = """
            SELECT a.*, p.name as pet_name, t.name as treatment_name,
                   t.duration_minutes as treatment_duration, t.price as treatment_price
            FROM appointments a
            JOIN pets p ON a.pet_id = p.id
            JOIN treatments t ON a.treatment_id = t.id
            WHERE 1=1
        """
        params: list = []

        if date_str:
            query += " AND date(a.scheduled_at) = ?"
            params.append(date_str)
        if pet_id:
            query += " AND a.pet_id = ?"
            params.append(pet_id)
        if status:
            query += " AND a.status = ?"
            params.append(status)

        query += " ORDER BY a.scheduled_at"

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=AppointmentResponse, status_code=201)
async def create_appointment(appt: AppointmentCreate):
    db = await get_db()
    try:
        # Validate pet exists
        cursor = await db.execute("SELECT id FROM pets WHERE id = ?", (appt.pet_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Pet not found")

        # Validate treatment exists and get duration
        cursor = await db.execute(
            "SELECT * FROM treatments WHERE id = ?", (appt.treatment_id,)
        )
        treatment = await cursor.fetchone()
        if not treatment:
            raise HTTPException(status_code=404, detail="Treatment not found")

        scheduled = appt.scheduled_at.replace(tzinfo=None)
        duration = treatment["duration_minutes"]

        _validate_clinic_hours(scheduled, duration)

        if await _check_overlap(db, scheduled, duration):
            raise HTTPException(status_code=409, detail="Time slot is not available (overlapping appointment)")

        cursor = await db.execute(
            """INSERT INTO appointments (pet_id, treatment_id, scheduled_at, notes, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (appt.pet_id, appt.treatment_id, scheduled.isoformat(),
             appt.notes, datetime.now().isoformat()),
        )
        await db.commit()
        aid = cursor.lastrowid

        cursor = await db.execute(
            """SELECT a.*, p.name as pet_name, t.name as treatment_name,
                      t.duration_minutes as treatment_duration, t.price as treatment_price
               FROM appointments a
               JOIN pets p ON a.pet_id = p.id
               JOIN treatments t ON a.treatment_id = t.id
               WHERE a.id = ?""",
            (aid,),
        )
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: int):
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT a.*, p.name as pet_name, t.name as treatment_name,
                      t.duration_minutes as treatment_duration, t.price as treatment_price
               FROM appointments a
               JOIN pets p ON a.pet_id = p.id
               JOIN treatments t ON a.treatment_id = t.id
               WHERE a.id = ?""",
            (appointment_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return dict(row)
    finally:
        await db.close()


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: int, appt: AppointmentUpdate):
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT a.*, t.duration_minutes
               FROM appointments a
               JOIN treatments t ON a.treatment_id = t.id
               WHERE a.id = ?""",
            (appointment_id,),
        )
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Appointment not found")

        data = appt.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Convert enum
        if "status" in data and data["status"] is not None:
            data["status"] = data["status"].value

        # If rescheduling or changing treatment, validate
        new_scheduled = data.get("scheduled_at", datetime.fromisoformat(existing["scheduled_at"]))
        if isinstance(new_scheduled, datetime):
            new_scheduled = new_scheduled.replace(tzinfo=None)

        new_treatment_id = data.get("treatment_id", existing["treatment_id"])

        if "scheduled_at" in data or "treatment_id" in data:
            cursor = await db.execute(
                "SELECT duration_minutes FROM treatments WHERE id = ?", (new_treatment_id,)
            )
            treat_row = await cursor.fetchone()
            if not treat_row:
                raise HTTPException(status_code=404, detail="Treatment not found")
            duration = treat_row["duration_minutes"]

            _validate_clinic_hours(new_scheduled, duration)

            if await _check_overlap(db, new_scheduled, duration, exclude_id=appointment_id):
                raise HTTPException(status_code=409, detail="Time slot is not available (overlapping appointment)")

        # Convert datetime to string for storage
        if "scheduled_at" in data:
            data["scheduled_at"] = new_scheduled.isoformat()

        set_clause = ", ".join(f"{k} = ?" for k in data)
        values = list(data.values()) + [appointment_id]
        await db.execute(f"UPDATE appointments SET {set_clause} WHERE id = ?", values)
        await db.commit()

        cursor = await db.execute(
            """SELECT a.*, p.name as pet_name, t.name as treatment_name,
                      t.duration_minutes as treatment_duration, t.price as treatment_price
               FROM appointments a
               JOIN pets p ON a.pet_id = p.id
               JOIN treatments t ON a.treatment_id = t.id
               WHERE a.id = ?""",
            (appointment_id,),
        )
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.delete("/{appointment_id}", status_code=204)
async def delete_appointment(appointment_id: int):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM appointments WHERE id = ?", (appointment_id,)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Appointment not found")
        await db.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
        await db.commit()
    finally:
        await db.close()
