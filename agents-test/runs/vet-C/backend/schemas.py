from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class PetCreate(BaseModel):
    name: str
    species: str
    breed: Optional[str] = None
    age_years: float
    owner_name: str
    owner_phone: str
    notes: Optional[str] = None

class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    age_years: Optional[float] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
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
    price: Decimal

class TreatmentUpdate(BaseModel):
    name: Optional[str] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None

class TreatmentResponse(BaseModel):
    id: int
    name: str
    duration_minutes: int
    description: Optional[str]
    price: Decimal
    
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

class TimeSlot(BaseModel):
    start_time: datetime
    end_time: datetime
