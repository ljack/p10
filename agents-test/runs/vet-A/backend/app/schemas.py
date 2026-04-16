from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

# Pet Schemas
class PetBase(BaseModel):
    name: str
    species: str  # dog, cat, bird, rabbit, other
    breed: Optional[str] = None
    age_years: float
    owner_name: str
    owner_phone: str
    notes: Optional[str] = None

class PetCreate(PetBase):
    pass

class PetUpdate(PetBase):
    pass

class Pet(PetBase):
    id: int
    
    class Config:
        from_attributes = True

# Treatment Schemas
class TreatmentBase(BaseModel):
    name: str
    duration_minutes: int
    description: Optional[str] = None
    price: Decimal

class TreatmentCreate(TreatmentBase):
    pass

class TreatmentUpdate(TreatmentBase):
    pass

class Treatment(TreatmentBase):
    id: int
    
    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentBase(BaseModel):
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    status: str = "scheduled"
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class Appointment(AppointmentBase):
    id: int
    created_at: datetime
    pet: Pet
    treatment: Treatment
    
    class Config:
        from_attributes = True

# Available Slots
class AvailableSlot(BaseModel):
    start_time: datetime
    end_time: datetime
