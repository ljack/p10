from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class Species(str, Enum):
    dog = "dog"
    cat = "cat"
    bird = "bird"
    rabbit = "rabbit"
    other = "other"


class AppointmentStatus(str, Enum):
    scheduled = "scheduled"
    in_progress = "in-progress"
    completed = "completed"
    cancelled = "cancelled"


# --- Pet ---
class PetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    species: Species
    breed: Optional[str] = None
    age_years: float = Field(..., gt=0)
    owner_name: str = Field(..., min_length=1, max_length=100)
    owner_phone: str = Field(..., min_length=1, max_length=30)
    notes: Optional[str] = None


class PetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    species: Optional[Species] = None
    breed: Optional[str] = None
    age_years: Optional[float] = Field(None, gt=0)
    owner_name: Optional[str] = Field(None, min_length=1, max_length=100)
    owner_phone: Optional[str] = Field(None, min_length=1, max_length=30)
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


# --- Treatment ---
class TreatmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    duration_minutes: int = Field(..., gt=0)
    description: Optional[str] = None
    price: float = Field(..., gt=0)


class TreatmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    duration_minutes: Optional[int] = Field(None, gt=0)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)


class TreatmentResponse(BaseModel):
    id: int
    name: str
    duration_minutes: int
    description: Optional[str]
    price: float


# --- Appointment ---
class AppointmentCreate(BaseModel):
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    pet_id: Optional[int] = None
    treatment_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    pet_id: int
    treatment_id: int
    scheduled_at: str
    status: str
    notes: Optional[str]
    created_at: str
    pet_name: Optional[str] = None
    treatment_name: Optional[str] = None
    treatment_duration: Optional[int] = None
    treatment_price: Optional[float] = None


class AvailableSlot(BaseModel):
    start: str
    end: str
