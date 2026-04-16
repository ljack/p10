from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import AppointmentStatus, Species


class PetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    species: Species
    breed: Optional[str] = Field(default=None, max_length=120)
    age_years: float = Field(..., gt=0, le=100)
    owner_name: str = Field(..., min_length=1, max_length=120)
    owner_phone: str = Field(..., min_length=1, max_length=50)
    notes: Optional[str] = None


class PetCreate(PetBase):
    pass


class PetUpdate(PetBase):
    pass


class PetRead(PetBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class TreatmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    duration_minutes: int = Field(..., ge=15, le=480)
    description: Optional[str] = None
    price: float = Field(..., gt=0)


class TreatmentCreate(TreatmentBase):
    pass


class TreatmentUpdate(TreatmentBase):
    pass


class TreatmentRead(TreatmentBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AppointmentBase(BaseModel):
    pet_id: int = Field(..., ge=1)
    treatment_id: int = Field(..., ge=1)
    scheduled_at: datetime
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    status: AppointmentStatus = AppointmentStatus.scheduled


class AppointmentUpdate(AppointmentBase):
    status: AppointmentStatus


class AppointmentRead(BaseModel):
    id: int
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    status: AppointmentStatus
    notes: Optional[str]
    created_at: datetime
    pet: PetRead
    treatment: TreatmentRead

    model_config = ConfigDict(from_attributes=True)


class SlotWindow(BaseModel):
    start: datetime
    end: datetime


class AvailableSlotsRead(BaseModel):
    date: date
    treatment_id: int
    duration_minutes: int
    slots: list[SlotWindow]
