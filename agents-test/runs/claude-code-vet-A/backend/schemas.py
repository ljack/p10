from datetime import datetime

from pydantic import BaseModel


class PetCreate(BaseModel):
    name: str
    species: str
    breed: str | None = None
    age_years: float
    owner_name: str
    owner_phone: str
    notes: str | None = None


class PetUpdate(BaseModel):
    name: str | None = None
    species: str | None = None
    breed: str | None = None
    age_years: float | None = None
    owner_name: str | None = None
    owner_phone: str | None = None
    notes: str | None = None


class PetResponse(BaseModel):
    id: int
    name: str
    species: str
    breed: str | None
    age_years: float
    owner_name: str
    owner_phone: str
    notes: str | None

    model_config = {"from_attributes": True}


class TreatmentCreate(BaseModel):
    name: str
    duration_minutes: int
    description: str | None = None
    price: float


class TreatmentUpdate(BaseModel):
    name: str | None = None
    duration_minutes: int | None = None
    description: str | None = None
    price: float | None = None


class TreatmentResponse(BaseModel):
    id: int
    name: str
    duration_minutes: int
    description: str | None
    price: float

    model_config = {"from_attributes": True}


class AppointmentCreate(BaseModel):
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    pet_id: int | None = None
    treatment_id: int | None = None
    scheduled_at: datetime | None = None
    status: str | None = None
    notes: str | None = None


class AppointmentResponse(BaseModel):
    id: int
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    status: str
    notes: str | None
    created_at: datetime
    pet: PetResponse | None = None
    treatment: TreatmentResponse | None = None

    model_config = {"from_attributes": True}


class TimeSlot(BaseModel):
    start: str
    end: str
