from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, date, time, timedelta
import database
import schemas

app = FastAPI(title="Vet Appointment API")

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await database.init_db()

# ==================== PET ENDPOINTS ====================

@app.get("/api/pets", response_model=List[schemas.PetResponse])
async def list_pets(
    owner_name: Optional[str] = None,
    db: AsyncSession = Depends(database.get_db)
):
    query = select(database.Pet)
    if owner_name:
        query = query.where(database.Pet.owner_name.ilike(f"%{owner_name}%"))
    result = await db.execute(query)
    pets = result.scalars().all()
    return pets

@app.post("/api/pets", response_model=schemas.PetResponse)
async def create_pet(
    pet: schemas.PetCreate,
    db: AsyncSession = Depends(database.get_db)
):
    db_pet = database.Pet(**pet.model_dump())
    db.add(db_pet)
    await db.commit()
    await db.refresh(db_pet)
    return db_pet

@app.get("/api/pets/{pet_id}", response_model=schemas.PetResponse)
async def get_pet(pet_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(database.Pet).where(database.Pet.id == pet_id))
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet

@app.put("/api/pets/{pet_id}", response_model=schemas.PetResponse)
async def update_pet(
    pet_id: int,
    pet_update: schemas.PetUpdate,
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(database.Pet).where(database.Pet.id == pet_id))
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    for key, value in pet_update.model_dump(exclude_unset=True).items():
        setattr(pet, key, value)
    
    await db.commit()
    await db.refresh(pet)
    return pet

@app.delete("/api/pets/{pet_id}")
async def delete_pet(pet_id: int, db: AsyncSession = Depends(database.get_db)):
    # Check for appointments
    result = await db.execute(
        select(database.Appointment).where(database.Appointment.pet_id == pet_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cannot delete pet with existing appointments")
    
    result = await db.execute(select(database.Pet).where(database.Pet.id == pet_id))
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    await db.delete(pet)
    await db.commit()
    return {"message": "Pet deleted successfully"}

# ==================== TREATMENT ENDPOINTS ====================

@app.get("/api/treatments", response_model=List[schemas.TreatmentResponse])
async def list_treatments(db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(database.Treatment))
    treatments = result.scalars().all()
    return treatments

@app.post("/api/treatments", response_model=schemas.TreatmentResponse)
async def create_treatment(
    treatment: schemas.TreatmentCreate,
    db: AsyncSession = Depends(database.get_db)
):
    db_treatment = database.Treatment(**treatment.model_dump())
    db.add(db_treatment)
    await db.commit()
    await db.refresh(db_treatment)
    return db_treatment

@app.put("/api/treatments/{treatment_id}", response_model=schemas.TreatmentResponse)
async def update_treatment(
    treatment_id: int,
    treatment_update: schemas.TreatmentUpdate,
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(database.Treatment).where(database.Treatment.id == treatment_id)
    )
    treatment = result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    for key, value in treatment_update.model_dump(exclude_unset=True).items():
        setattr(treatment, key, value)
    
    await db.commit()
    await db.refresh(treatment)
    return treatment

@app.delete("/api/treatments/{treatment_id}")
async def delete_treatment(treatment_id: int, db: AsyncSession = Depends(database.get_db)):
    # Check for appointments
    result = await db.execute(
        select(database.Appointment).where(database.Appointment.treatment_id == treatment_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cannot delete treatment with existing appointments")
    
    result = await db.execute(
        select(database.Treatment).where(database.Treatment.id == treatment_id)
    )
    treatment = result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    await db.delete(treatment)
    await db.commit()
    return {"message": "Treatment deleted successfully"}

# ==================== APPOINTMENT ENDPOINTS ====================

@app.get("/api/appointments", response_model=List[schemas.AppointmentResponse])
async def list_appointments(
    date: Optional[str] = None,
    pet_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(database.get_db)
):
    query = select(database.Appointment).options(
        selectinload(database.Appointment.pet),
        selectinload(database.Appointment.treatment)
    )
    
    conditions = []
    if date:
        target_date = datetime.fromisoformat(date).date()
        start_of_day = datetime.combine(target_date, time.min)
        end_of_day = datetime.combine(target_date, time.max)
        conditions.append(database.Appointment.scheduled_at >= start_of_day)
        conditions.append(database.Appointment.scheduled_at <= end_of_day)
    
    if pet_id:
        conditions.append(database.Appointment.pet_id == pet_id)
    
    if status:
        conditions.append(database.Appointment.status == status)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    return appointments

@app.post("/api/appointments", response_model=schemas.AppointmentResponse)
async def create_appointment(
    appointment: schemas.AppointmentCreate,
    db: AsyncSession = Depends(database.get_db)
):
    # Validate pet exists
    pet_result = await db.execute(
        select(database.Pet).where(database.Pet.id == appointment.pet_id)
    )
    if not pet_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Validate treatment exists
    treatment_result = await db.execute(
        select(database.Treatment).where(database.Treatment.id == appointment.treatment_id)
    )
    treatment = treatment_result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    # Validate clinic hours (08:00-17:00, Monday-Friday)
    scheduled_time = appointment.scheduled_at
    if scheduled_time.weekday() >= 5:  # Saturday=5, Sunday=6
        raise HTTPException(status_code=400, detail="Clinic is closed on weekends")
    
    if scheduled_time.hour < 8 or scheduled_time.hour >= 17:
        raise HTTPException(status_code=400, detail="Appointment must be between 08:00 and 17:00")
    
    # Check for overlapping appointments
    end_time = scheduled_time + timedelta(minutes=treatment.duration_minutes)
    
    # Get all non-cancelled appointments for that day
    overlapping_query = select(database.Appointment).options(
        selectinload(database.Appointment.treatment)
    ).where(
        and_(
            database.Appointment.status != database.AppointmentStatus.cancelled,
            database.Appointment.scheduled_at >= datetime.combine(scheduled_time.date(), time.min),
            database.Appointment.scheduled_at <= datetime.combine(scheduled_time.date(), time.max)
        )
    )
    
    result = await db.execute(overlapping_query)
    existing_appointments = result.scalars().all()
    
    for existing in existing_appointments:
        existing_end = existing.scheduled_at + timedelta(minutes=existing.treatment.duration_minutes)
        # Check if appointments overlap
        if not (end_time <= existing.scheduled_at or scheduled_time >= existing_end):
            raise HTTPException(
                status_code=400,
                detail=f"Time slot conflicts with existing appointment at {existing.scheduled_at.strftime('%H:%M')}"
            )
    
    db_appointment = database.Appointment(
        pet_id=appointment.pet_id,
        treatment_id=appointment.treatment_id,
        scheduled_at=appointment.scheduled_at,
        notes=appointment.notes,
        status=database.AppointmentStatus.scheduled
    )
    db.add(db_appointment)
    await db.commit()
    await db.refresh(db_appointment)
    
    # Load relationships
    result = await db.execute(
        select(database.Appointment).options(
            selectinload(database.Appointment.pet),
            selectinload(database.Appointment.treatment)
        ).where(database.Appointment.id == db_appointment.id)
    )
    return result.scalar_one()

@app.get("/api/appointments/available-slots", response_model=List[schemas.TimeSlot])
async def get_available_slots(
    date: str = Query(...),
    treatment_id: int = Query(...),
    db: AsyncSession = Depends(database.get_db)
):
    # Validate treatment exists
    treatment_result = await db.execute(
        select(database.Treatment).where(database.Treatment.id == treatment_id)
    )
    treatment = treatment_result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    # Parse target date
    target_date = datetime.fromisoformat(date).date()
    
    # Check if weekend
    if target_date.weekday() >= 5:
        return []
    
    # Get all non-cancelled appointments for that day
    start_of_day = datetime.combine(target_date, time(8, 0))
    end_of_day = datetime.combine(target_date, time(17, 0))
    
    appointments_query = select(database.Appointment).options(
        selectinload(database.Appointment.treatment)
    ).where(
        and_(
            database.Appointment.status != database.AppointmentStatus.cancelled,
            database.Appointment.scheduled_at >= start_of_day,
            database.Appointment.scheduled_at < end_of_day
        )
    )
    
    result = await db.execute(appointments_query)
    existing_appointments = result.scalars().all()
    
    # Create occupied time ranges
    occupied_ranges = []
    for appt in existing_appointments:
        appt_start = appt.scheduled_at
        appt_end = appt_start + timedelta(minutes=appt.treatment.duration_minutes)
        occupied_ranges.append((appt_start, appt_end))
    
    # Generate all possible slots (30-minute increments)
    available_slots = []
    current = start_of_day
    clinic_close = end_of_day
    
    while current < clinic_close:
        slot_end = current + timedelta(minutes=treatment.duration_minutes)
        
        # Check if slot fits before clinic closes
        if slot_end > clinic_close:
            break
        
        # Check if slot overlaps with any occupied range
        is_available = True
        for occupied_start, occupied_end in occupied_ranges:
            if not (slot_end <= occupied_start or current >= occupied_end):
                is_available = False
                break
        
        if is_available:
            available_slots.append(schemas.TimeSlot(start_time=current, end_time=slot_end))
        
        # Move to next 30-minute slot
        current += timedelta(minutes=30)
    
    return available_slots

@app.get("/api/appointments/{appointment_id}", response_model=schemas.AppointmentResponse)
async def get_appointment(appointment_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(
        select(database.Appointment).options(
            selectinload(database.Appointment.pet),
            selectinload(database.Appointment.treatment)
        ).where(database.Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@app.put("/api/appointments/{appointment_id}", response_model=schemas.AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_update: schemas.AppointmentUpdate,
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(database.Appointment).options(
            selectinload(database.Appointment.pet),
            selectinload(database.Appointment.treatment)
        ).where(database.Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # If rescheduling, validate new time
    if appointment_update.scheduled_at:
        new_time = appointment_update.scheduled_at
        
        # Validate clinic hours
        if new_time.weekday() >= 5:
            raise HTTPException(status_code=400, detail="Clinic is closed on weekends")
        if new_time.hour < 8 or new_time.hour >= 17:
            raise HTTPException(status_code=400, detail="Appointment must be between 08:00 and 17:00")
        
        # Check overlaps (excluding current appointment)
        treatment_result = await db.execute(
            select(database.Treatment).where(database.Treatment.id == appointment.treatment_id)
        )
        treatment = treatment_result.scalar_one()
        end_time = new_time + timedelta(minutes=treatment.duration_minutes)
        
        overlapping_query = select(database.Appointment).options(
            selectinload(database.Appointment.treatment)
        ).where(
            and_(
                database.Appointment.id != appointment_id,
                database.Appointment.status != database.AppointmentStatus.cancelled,
                database.Appointment.scheduled_at >= datetime.combine(new_time.date(), time.min),
                database.Appointment.scheduled_at <= datetime.combine(new_time.date(), time.max)
            )
        )
        
        result = await db.execute(overlapping_query)
        existing_appointments = result.scalars().all()
        
        for existing in existing_appointments:
            existing_end = existing.scheduled_at + timedelta(minutes=existing.treatment.duration_minutes)
            if not (end_time <= existing.scheduled_at or new_time >= existing_end):
                raise HTTPException(
                    status_code=400,
                    detail=f"Time slot conflicts with existing appointment at {existing.scheduled_at.strftime('%H:%M')}"
                )
    
    for key, value in appointment_update.model_dump(exclude_unset=True).items():
        if key == "status" and value:
            setattr(appointment, key, database.AppointmentStatus(value))
        else:
            setattr(appointment, key, value)
    
    await db.commit()
    await db.refresh(appointment)
    
    # Reload with relationships
    result = await db.execute(
        select(database.Appointment).options(
            selectinload(database.Appointment.pet),
            selectinload(database.Appointment.treatment)
        ).where(database.Appointment.id == appointment_id)
    )
    return result.scalar_one()

@app.delete("/api/appointments/{appointment_id}")
async def delete_appointment(appointment_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(
        select(database.Appointment).where(database.Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    await db.delete(appointment)
    await db.commit()
    return {"message": "Appointment deleted successfully"}

@app.get("/")
async def root():
    return {"message": "Vet Appointment API", "docs": "/docs"}
