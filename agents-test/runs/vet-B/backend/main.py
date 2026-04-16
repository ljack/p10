from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, time
from database import init_db, get_db, Pet, Treatment, Appointment, AppointmentStatus

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

class PetCreate(BaseModel):
    name: str
    species: str
    breed: Optional[str] = None
    age_years: float
    owner_name: str
    owner_phone: str
    notes: Optional[str] = None

class PetResponse(BaseModel):
    id: int
    name: str
    species: str
    breed: Optional[str]
    age_years: float
    owner_name: str
    owner_phone: str
    notes: Optional[str]
    
    class Config:
        from_attributes = True

class TreatmentCreate(BaseModel):
    name: str
    duration_minutes: int
    description: Optional[str] = None
    price: float

class TreatmentResponse(BaseModel):
    id: int
    name: str
    duration_minutes: int
    description: Optional[str]
    price: float
    
    class Config:
        from_attributes = True

class AppointmentCreate(BaseModel):
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    status: str
    notes: Optional[str]
    created_at: datetime
    pet: PetResponse
    treatment: TreatmentResponse
    
    class Config:
        from_attributes = True

@app.get("/api/pets", response_model=List[PetResponse])
def list_pets(owner_name: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Pet)
    if owner_name:
        query = query.filter(Pet.owner_name.contains(owner_name))
    return query.all()

@app.post("/api/pets", response_model=PetResponse)
def create_pet(pet: PetCreate, db: Session = Depends(get_db)):
    db_pet = Pet(**pet.dict())
    db.add(db_pet)
    db.commit()
    db.refresh(db_pet)
    return db_pet

@app.get("/api/pets/{id}", response_model=PetResponse)
def get_pet(id: int, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.id == id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet

@app.put("/api/pets/{id}", response_model=PetResponse)
def update_pet(id: int, pet: PetCreate, db: Session = Depends(get_db)):
    db_pet = db.query(Pet).filter(Pet.id == id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    for key, value in pet.dict().items():
        setattr(db_pet, key, value)
    db.commit()
    db.refresh(db_pet)
    return db_pet

@app.delete("/api/pets/{id}")
def delete_pet(id: int, db: Session = Depends(get_db)):
    db_pet = db.query(Pet).filter(Pet.id == id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    db.delete(db_pet)
    db.commit()
    return {"message": "Pet deleted"}

@app.get("/api/treatments", response_model=List[TreatmentResponse])
def list_treatments(db: Session = Depends(get_db)):
    return db.query(Treatment).all()

@app.post("/api/treatments", response_model=TreatmentResponse)
def create_treatment(treatment: TreatmentCreate, db: Session = Depends(get_db)):
    db_treatment = Treatment(**treatment.dict())
    db.add(db_treatment)
    db.commit()
    db.refresh(db_treatment)
    return db_treatment

@app.put("/api/treatments/{id}", response_model=TreatmentResponse)
def update_treatment(id: int, treatment: TreatmentCreate, db: Session = Depends(get_db)):
    db_treatment = db.query(Treatment).filter(Treatment.id == id).first()
    if not db_treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    for key, value in treatment.dict().items():
        setattr(db_treatment, key, value)
    db.commit()
    db.refresh(db_treatment)
    return db_treatment

@app.delete("/api/treatments/{id}")
def delete_treatment(id: int, db: Session = Depends(get_db)):
    db_treatment = db.query(Treatment).filter(Treatment.id == id).first()
    if not db_treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    db.delete(db_treatment)
    db.commit()
    return {"message": "Treatment deleted"}

@app.get("/api/appointments", response_model=List[AppointmentResponse])
def list_appointments(
    date: Optional[str] = None,
    pet_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Appointment)
    if date:
        try:
            target_date = datetime.fromisoformat(date).date()
            query = query.filter(
                db.query(Appointment).filter(
                    db.func.date(Appointment.scheduled_at) == target_date
                ).exists()
            )
        except:
            pass
    if pet_id:
        query = query.filter(Appointment.pet_id == pet_id)
    if status:
        query = query.filter(Appointment.status == status)
    return query.all()

@app.post("/api/appointments", response_model=AppointmentResponse)
def create_appointment(appointment: AppointmentCreate, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.id == appointment.pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    treatment = db.query(Treatment).filter(Treatment.id == appointment.treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    scheduled_time = appointment.scheduled_at.time()
    if scheduled_time < time(8, 0) or scheduled_time >= time(17, 0):
        raise HTTPException(status_code=400, detail="Appointments must be between 08:00 and 17:00")
    
    if appointment.scheduled_at.weekday() >= 5:
        raise HTTPException(status_code=400, detail="Appointments only available Monday-Friday")
    
    end_time = appointment.scheduled_at + timedelta(minutes=treatment.duration_minutes)
    
    overlapping = db.query(Appointment).filter(
        Appointment.status != "cancelled",
        Appointment.scheduled_at < end_time,
        db.func.datetime(Appointment.scheduled_at, '+' + db.func.cast(Treatment.duration_minutes, db.String) + ' minutes') > appointment.scheduled_at
    ).join(Treatment).first()
    
    if overlapping:
        raise HTTPException(status_code=400, detail="Time slot not available")
    
    db_appointment = Appointment(**appointment.dict(), status="scheduled")
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.get("/api/appointments/{id}", response_model=AppointmentResponse)
def get_appointment(id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@app.put("/api/appointments/{id}", response_model=AppointmentResponse)
def update_appointment(id: int, update: AppointmentUpdate, db: Session = Depends(get_db)):
    db_appointment = db.query(Appointment).filter(Appointment.id == id).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    for key, value in update.dict(exclude_unset=True).items():
        setattr(db_appointment, key, value)
    
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.delete("/api/appointments/{id}")
def delete_appointment(id: int, db: Session = Depends(get_db)):
    db_appointment = db.query(Appointment).filter(Appointment.id == id).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(db_appointment)
    db.commit()
    return {"message": "Appointment deleted"}

@app.get("/api/appointments/available-slots")
def get_available_slots(date: str, treatment_id: int, db: Session = Depends(get_db)):
    try:
        target_date = datetime.fromisoformat(date).date()
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    if target_date.weekday() >= 5:
        return []
    
    treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    appointments = db.query(Appointment).filter(
        db.func.date(Appointment.scheduled_at) == target_date,
        Appointment.status != "cancelled"
    ).all()
    
    start_time = datetime.combine(target_date, time(8, 0))
    end_time = datetime.combine(target_date, time(17, 0))
    
    slots = []
    current = start_time
    
    while current + timedelta(minutes=treatment.duration_minutes) <= end_time:
        slot_end = current + timedelta(minutes=treatment.duration_minutes)
        
        is_available = True
        for appt in appointments:
            appt_end = appt.scheduled_at + timedelta(minutes=appt.treatment.duration_minutes)
            if not (slot_end <= appt.scheduled_at or current >= appt_end):
                is_available = False
                break
        
        if is_available:
            slots.append(current.isoformat())
        
        current += timedelta(minutes=30)
    
    return slots
