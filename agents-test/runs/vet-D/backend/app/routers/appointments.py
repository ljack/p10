"""Appointment endpoints router."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, time as dt_time
from app.database import get_db
from app.models.appointment import Appointment
from app.models.pet import Pet
from app.models.treatment import Treatment
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    AvailableSlot,
    AppointmentStatus
)

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

# Clinic hours
CLINIC_OPEN = dt_time(8, 0)  # 8:00 AM
CLINIC_CLOSE = dt_time(17, 0)  # 5:00 PM
SLOT_INTERVAL_MINUTES = 30


def is_within_clinic_hours(scheduled_at: datetime, duration_minutes: int) -> bool:
    """Check if appointment is within clinic hours."""
    appointment_time = scheduled_at.time()
    end_time = (scheduled_at + timedelta(minutes=duration_minutes)).time()
    
    return (CLINIC_OPEN <= appointment_time < CLINIC_CLOSE and
            end_time <= CLINIC_CLOSE)


def is_weekday(scheduled_at: datetime) -> bool:
    """Check if date is a weekday (Monday-Friday)."""
    return scheduled_at.weekday() < 5  # 0-4 are Monday-Friday


def check_appointment_overlap(
    db: Session,
    scheduled_at: datetime,
    duration_minutes: int,
    exclude_appointment_id: Optional[int] = None
) -> bool:
    """Check if appointment overlaps with existing appointments."""
    end_time = scheduled_at + timedelta(minutes=duration_minutes)
    
    query = db.query(Appointment).filter(
        Appointment.status != AppointmentStatus.cancelled
    )
    
    if exclude_appointment_id:
        query = query.filter(Appointment.id != exclude_appointment_id)
    
    existing_appointments = query.all()
    
    for appt in existing_appointments:
        treatment = db.query(Treatment).filter(Treatment.id == appt.treatment_id).first()
        if treatment:
            appt_end = appt.scheduled_at + timedelta(minutes=treatment.duration_minutes)
            
            # Check for overlap
            if (scheduled_at < appt_end and end_time > appt.scheduled_at):
                return True
    
    return False


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(appointment: AppointmentCreate, db: Session = Depends(get_db)):
    """Create a new appointment with validation."""
    # Validate pet exists
    pet = db.query(Pet).filter(Pet.id == appointment.pet_id).first()
    if not pet:
        raise HTTPException(status_code=422, detail="Pet not found")
    
    # Validate treatment exists
    treatment = db.query(Treatment).filter(Treatment.id == appointment.treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=422, detail="Treatment not found")
    
    # Validate weekday
    if not is_weekday(appointment.scheduled_at):
        raise HTTPException(
            status_code=422,
            detail="Appointments are only available Monday-Friday"
        )
    
    # Validate clinic hours
    if not is_within_clinic_hours(appointment.scheduled_at, treatment.duration_minutes):
        raise HTTPException(
            status_code=422,
            detail="Appointment must be within clinic hours (08:00-17:00)"
        )
    
    # Check for overlaps
    if check_appointment_overlap(db, appointment.scheduled_at, treatment.duration_minutes):
        raise HTTPException(
            status_code=422,
            detail="Appointment time slot overlaps with an existing appointment"
        )
    
    db_appointment = Appointment(**appointment.model_dump())
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    date: Optional[str] = Query(None),
    pet_id: Optional[int] = Query(None),
    status: Optional[AppointmentStatus] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all appointments with optional filters."""
    query = db.query(Appointment)
    
    if date:
        # Filter by date (ignore time)
        from sqlalchemy import func
        target_date = datetime.fromisoformat(date).date()
        query = query.filter(func.date(Appointment.scheduled_at) == target_date)
    
    if pet_id:
        query = query.filter(Appointment.pet_id == pet_id)
    
    if status:
        query = query.filter(Appointment.status == status)
    
    return query.all()


@router.get("/available-slots", response_model=List[AvailableSlot])
def get_available_slots(
    date: str = Query(...),
    treatment_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Get available time slots for a specific date and treatment."""
    # Validate treatment exists
    treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=422, detail="Treatment not found")
    
    target_date = datetime.fromisoformat(date).date()
    target_datetime = datetime.combine(target_date, dt_time(0, 0))
    
    # Check if it's a weekday
    if not is_weekday(target_datetime):
        return []
    
    # Generate all possible slots
    available_slots = []
    current_time = datetime.combine(target_date, CLINIC_OPEN)
    
    while current_time.time() < CLINIC_CLOSE:
        # Check if slot + treatment duration fits within clinic hours
        end_time = current_time + timedelta(minutes=treatment.duration_minutes)
        
        if end_time.time() <= CLINIC_CLOSE:
            # Check if slot is available (no overlap)
            if not check_appointment_overlap(db, current_time, treatment.duration_minutes):
                available_slots.append(
                    AvailableSlot(
                        time=current_time.strftime("%H:%M"),
                        datetime=current_time
                    )
                )
        
        current_time += timedelta(minutes=SLOT_INTERVAL_MINUTES)
    
    return available_slots


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Get a specific appointment by ID."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    db: Session = Depends(get_db)
):
    """Update an appointment (reschedule or change status)."""
    db_appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Validate pet exists
    pet = db.query(Pet).filter(Pet.id == appointment_update.pet_id).first()
    if not pet:
        raise HTTPException(status_code=422, detail="Pet not found")
    
    # Validate treatment exists
    treatment = db.query(Treatment).filter(Treatment.id == appointment_update.treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=422, detail="Treatment not found")
    
    # If rescheduling, validate new time
    if db_appointment.scheduled_at != appointment_update.scheduled_at:
        if not is_weekday(appointment_update.scheduled_at):
            raise HTTPException(
                status_code=422,
                detail="Appointments are only available Monday-Friday"
            )
        
        if not is_within_clinic_hours(appointment_update.scheduled_at, treatment.duration_minutes):
            raise HTTPException(
                status_code=422,
                detail="Appointment must be within clinic hours (08:00-17:00)"
            )
        
        # Check for overlaps (excluding current appointment)
        if check_appointment_overlap(
            db,
            appointment_update.scheduled_at,
            treatment.duration_minutes,
            exclude_appointment_id=appointment_id
        ):
            raise HTTPException(
                status_code=422,
                detail="Appointment time slot overlaps with an existing appointment"
            )
    
    for key, value in appointment_update.model_dump().items():
        setattr(db_appointment, key, value)
    
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Delete/cancel an appointment."""
    db_appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    db.delete(db_appointment)
    db.commit()
    return None
