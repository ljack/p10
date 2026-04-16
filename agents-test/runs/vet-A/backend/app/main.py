from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime, date, time, timedelta
from decimal import Decimal

from . import models, schemas
from .database import get_db, init_db, engine
from .models import AppointmentStatus

app = FastAPI(title="Vet Clinic API")

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize database and seed treatments on first run"""
    await init_db()
    
    # Seed treatments if none exist
    async with engine.begin() as conn:
        from sqlalchemy import text
        result = await conn.execute(text("SELECT COUNT(*) FROM treatments"))
        count = result.scalar()
        
        if count == 0:
            # Insert seed treatments
            await conn.execute(
                text("""
                    INSERT INTO treatments (name, duration_minutes, description, price)
                    VALUES 
                        ('Vaccination', 15, 'Annual vaccination and health check', 75.00),
                        ('Dental Cleaning', 60, 'Professional dental cleaning under anesthesia', 250.00),
                        ('X-Ray', 30, 'Digital radiography examination', 150.00),
                        ('General Checkup', 20, 'Routine health examination', 60.00),
                        ('Surgery Consultation', 45, 'Pre-surgery consultation and assessment', 100.00)
                """)
            )
            await conn.commit()

# ============ PET ENDPOINTS ============

@app.get("/api/pets", response_model=List[schemas.Pet])
async def list_pets(
    owner_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List all pets with optional search by owner_name"""
    query = select(models.Pet)
    if owner_name:
        query = query.where(models.Pet.owner_name.ilike(f"%{owner_name}%"))
    
    result = await db.execute(query)
    pets = result.scalars().all()
    return pets

@app.post("/api/pets", response_model=schemas.Pet, status_code=201)
async def create_pet(pet: schemas.PetCreate, db: AsyncSession = Depends(get_db)):
    """Create a new pet"""
    db_pet = models.Pet(**pet.model_dump())
    db.add(db_pet)
    await db.commit()
    await db.refresh(db_pet)
    return db_pet

@app.get("/api/pets/{pet_id}", response_model=schemas.Pet)
async def get_pet(pet_id: int, db: AsyncSession = Depends(get_db)):
    """Get pet detail"""
    result = await db.execute(select(models.Pet).where(models.Pet.id == pet_id))
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet

@app.put("/api/pets/{pet_id}", response_model=schemas.Pet)
async def update_pet(pet_id: int, pet: schemas.PetUpdate, db: AsyncSession = Depends(get_db)):
    """Update pet"""
    result = await db.execute(select(models.Pet).where(models.Pet.id == pet_id))
    db_pet = result.scalar_one_or_none()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    for key, value in pet.model_dump().items():
        setattr(db_pet, key, value)
    
    await db.commit()
    await db.refresh(db_pet)
    return db_pet

@app.delete("/api/pets/{pet_id}", status_code=204)
async def delete_pet(pet_id: int, db: AsyncSession = Depends(get_db)):
    """Delete pet"""
    result = await db.execute(select(models.Pet).where(models.Pet.id == pet_id))
    db_pet = result.scalar_one_or_none()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    await db.delete(db_pet)
    await db.commit()
    return None

# ============ TREATMENT ENDPOINTS ============

@app.get("/api/treatments", response_model=List[schemas.Treatment])
async def list_treatments(db: AsyncSession = Depends(get_db)):
    """List all treatments"""
    result = await db.execute(select(models.Treatment))
    treatments = result.scalars().all()
    return treatments

@app.post("/api/treatments", response_model=schemas.Treatment, status_code=201)
async def create_treatment(treatment: schemas.TreatmentCreate, db: AsyncSession = Depends(get_db)):
    """Create a new treatment"""
    db_treatment = models.Treatment(**treatment.model_dump())
    db.add(db_treatment)
    await db.commit()
    await db.refresh(db_treatment)
    return db_treatment

@app.put("/api/treatments/{treatment_id}", response_model=schemas.Treatment)
async def update_treatment(
    treatment_id: int,
    treatment: schemas.TreatmentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update treatment"""
    result = await db.execute(select(models.Treatment).where(models.Treatment.id == treatment_id))
    db_treatment = result.scalar_one_or_none()
    if not db_treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    for key, value in treatment.model_dump().items():
        setattr(db_treatment, key, value)
    
    await db.commit()
    await db.refresh(db_treatment)
    return db_treatment

@app.delete("/api/treatments/{treatment_id}", status_code=204)
async def delete_treatment(treatment_id: int, db: AsyncSession = Depends(get_db)):
    """Delete treatment"""
    result = await db.execute(select(models.Treatment).where(models.Treatment.id == treatment_id))
    db_treatment = result.scalar_one_or_none()
    if not db_treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    await db.delete(db_treatment)
    await db.commit()
    return None

# ============ APPOINTMENT ENDPOINTS ============

@app.get("/api/appointments", response_model=List[schemas.Appointment])
async def list_appointments(
    date: Optional[str] = Query(None),
    pet_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List appointments with optional filters"""
    query = select(models.Appointment)
    
    conditions = []
    if date:
        target_date = datetime.fromisoformat(date).date()
        start_of_day = datetime.combine(target_date, time.min)
        end_of_day = datetime.combine(target_date, time.max)
        conditions.append(and_(
            models.Appointment.scheduled_at >= start_of_day,
            models.Appointment.scheduled_at <= end_of_day
        ))
    
    if pet_id:
        conditions.append(models.Appointment.pet_id == pet_id)
    
    if status:
        conditions.append(models.Appointment.status == status)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    result = await db.execute(query.order_by(models.Appointment.scheduled_at))
    appointments = result.scalars().all()
    
    # Load relationships
    for appointment in appointments:
        await db.refresh(appointment, ["pet", "treatment"])
    
    return appointments

@app.post("/api/appointments", response_model=schemas.Appointment, status_code=201)
async def create_appointment(
    appointment: schemas.AppointmentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Book a new appointment"""
    # Verify pet exists
    result = await db.execute(select(models.Pet).where(models.Pet.id == appointment.pet_id))
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Verify treatment exists
    result = await db.execute(select(models.Treatment).where(models.Treatment.id == appointment.treatment_id))
    treatment = result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    # Check if slot is available
    scheduled_at = appointment.scheduled_at
    end_time = scheduled_at + timedelta(minutes=treatment.duration_minutes)
    
    # Check for overlapping appointments (excluding cancelled)
    overlap_query = select(models.Appointment).join(models.Treatment).where(
        and_(
            models.Appointment.status != AppointmentStatus.CANCELLED,
            or_(
                # New appointment starts during existing appointment
                and_(
                    models.Appointment.scheduled_at <= scheduled_at,
                    models.Appointment.scheduled_at + timedelta(minutes=models.Treatment.duration_minutes) > scheduled_at
                ),
                # New appointment ends during existing appointment
                and_(
                    models.Appointment.scheduled_at < end_time,
                    models.Appointment.scheduled_at + timedelta(minutes=models.Treatment.duration_minutes) >= end_time
                ),
                # New appointment completely contains existing appointment
                and_(
                    models.Appointment.scheduled_at >= scheduled_at,
                    models.Appointment.scheduled_at + timedelta(minutes=models.Treatment.duration_minutes) <= end_time
                )
            )
        )
    )
    
    result = await db.execute(overlap_query)
    overlapping = result.scalar_one_or_none()
    
    if overlapping:
        raise HTTPException(status_code=409, detail="Time slot is not available")
    
    # Create appointment
    db_appointment = models.Appointment(**appointment.model_dump())
    db.add(db_appointment)
    await db.commit()
    await db.refresh(db_appointment, ["pet", "treatment"])
    return db_appointment

@app.get("/api/appointments/available-slots", response_model=List[schemas.AvailableSlot])
async def get_available_slots(
    date: str = Query(...),
    treatment_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get available time slots for a specific date and treatment"""
    # Get treatment
    result = await db.execute(select(models.Treatment).where(models.Treatment.id == treatment_id))
    treatment = result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    # Parse date
    target_date = datetime.fromisoformat(date).date()
    
    # Check if it's a weekday
    if target_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
        return []
    
    # Clinic hours: 08:00-17:00
    clinic_start = datetime.combine(target_date, time(8, 0))
    clinic_end = datetime.combine(target_date, time(17, 0))
    
    # Get all non-cancelled appointments for this date
    start_of_day = datetime.combine(target_date, time.min)
    end_of_day = datetime.combine(target_date, time.max)
    
    result = await db.execute(
        select(models.Appointment, models.Treatment).join(models.Treatment).where(
            and_(
                models.Appointment.scheduled_at >= start_of_day,
                models.Appointment.scheduled_at <= end_of_day,
                models.Appointment.status != AppointmentStatus.CANCELLED
            )
        ).order_by(models.Appointment.scheduled_at)
    )
    
    appointments = result.all()
    
    # Build list of busy periods
    busy_periods = []
    for appointment, appt_treatment in appointments:
        start = appointment.scheduled_at
        end = start + timedelta(minutes=appt_treatment.duration_minutes)
        busy_periods.append((start, end))
    
    # Generate available slots
    available_slots = []
    current_time = clinic_start
    slot_duration = timedelta(minutes=treatment.duration_minutes)
    
    for busy_start, busy_end in busy_periods:
        # Add slots before this busy period
        while current_time + slot_duration <= busy_start and current_time + slot_duration <= clinic_end:
            available_slots.append({
                "start_time": current_time,
                "end_time": current_time + slot_duration
            })
            current_time += timedelta(minutes=15)  # 15-minute increments
        
        # Move past this busy period
        if busy_end > current_time:
            current_time = busy_end
    
    # Add remaining slots until clinic closes
    while current_time + slot_duration <= clinic_end:
        available_slots.append({
            "start_time": current_time,
            "end_time": current_time + slot_duration
        })
        current_time += timedelta(minutes=15)
    
    return available_slots

@app.get("/api/appointments/{appointment_id}", response_model=schemas.Appointment)
async def get_appointment(appointment_id: int, db: AsyncSession = Depends(get_db)):
    """Get appointment detail"""
    result = await db.execute(
        select(models.Appointment).where(models.Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    await db.refresh(appointment, ["pet", "treatment"])
    return appointment

@app.put("/api/appointments/{appointment_id}", response_model=schemas.Appointment)
async def update_appointment(
    appointment_id: int,
    appointment: schemas.AppointmentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update appointment (reschedule or change status)"""
    result = await db.execute(
        select(models.Appointment).where(models.Appointment.id == appointment_id)
    )
    db_appointment = result.scalar_one_or_none()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # If rescheduling, check availability
    if appointment.scheduled_at and appointment.scheduled_at != db_appointment.scheduled_at:
        # Get treatment duration
        await db.refresh(db_appointment, ["treatment"])
        duration = db_appointment.treatment.duration_minutes
        
        scheduled_at = appointment.scheduled_at
        end_time = scheduled_at + timedelta(minutes=duration)
        
        # Check for overlapping appointments (excluding this one and cancelled ones)
        overlap_query = select(models.Appointment).join(models.Treatment).where(
            and_(
                models.Appointment.id != appointment_id,
                models.Appointment.status != AppointmentStatus.CANCELLED,
                or_(
                    and_(
                        models.Appointment.scheduled_at <= scheduled_at,
                        models.Appointment.scheduled_at + timedelta(minutes=models.Treatment.duration_minutes) > scheduled_at
                    ),
                    and_(
                        models.Appointment.scheduled_at < end_time,
                        models.Appointment.scheduled_at + timedelta(minutes=models.Treatment.duration_minutes) >= end_time
                    ),
                    and_(
                        models.Appointment.scheduled_at >= scheduled_at,
                        models.Appointment.scheduled_at + timedelta(minutes=models.Treatment.duration_minutes) <= end_time
                    )
                )
            )
        )
        
        result = await db.execute(overlap_query)
        overlapping = result.scalar_one_or_none()
        
        if overlapping:
            raise HTTPException(status_code=409, detail="Time slot is not available")
    
    # Update fields
    for key, value in appointment.model_dump(exclude_unset=True).items():
        setattr(db_appointment, key, value)
    
    await db.commit()
    await db.refresh(db_appointment, ["pet", "treatment"])
    return db_appointment

@app.delete("/api/appointments/{appointment_id}", status_code=204)
async def delete_appointment(appointment_id: int, db: AsyncSession = Depends(get_db)):
    """Cancel appointment"""
    result = await db.execute(
        select(models.Appointment).where(models.Appointment.id == appointment_id)
    )
    db_appointment = result.scalar_one_or_none()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Mark as cancelled instead of deleting
    db_appointment.status = AppointmentStatus.CANCELLED
    await db.commit()
    return None

@app.get("/")
async def root():
    return {"message": "Vet Clinic API", "version": "1.0"}
