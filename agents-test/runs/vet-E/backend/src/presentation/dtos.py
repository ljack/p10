"""Data Transfer Objects for API."""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

from ..domain.value_objects import Species, AppointmentStatus


class HATEOASLink(BaseModel):
    """HATEOAS link."""
    rel: str
    href: str
    method: str


class PetCreateRequest(BaseModel):
    """Request to create a pet."""
    name: str = Field(..., min_length=1, max_length=100)
    species: Species
    age_years: float = Field(..., ge=0)
    owner_name: str = Field(..., min_length=1, max_length=100)
    owner_phone: str = Field(..., min_length=1, max_length=20)
    breed: str | None = Field(None, max_length=100)
    notes: str | None = None


class PetUpdateRequest(BaseModel):
    """Request to update a pet."""
    name: str | None = Field(None, min_length=1, max_length=100)
    species: Species | None = None
    age_years: float | None = Field(None, ge=0)
    owner_name: str | None = Field(None, min_length=1, max_length=100)
    owner_phone: str | None = Field(None, min_length=1, max_length=20)
    breed: str | None = Field(None, max_length=100)
    notes: str | None = None


class PetResponse(BaseModel):
    """Pet response."""
    id: int
    name: str
    species: Species
    age_years: float
    owner_name: str
    owner_phone: str
    breed: str | None
    notes: str | None
    links: list[HATEOASLink] = Field(default_factory=list)


class TreatmentCreateRequest(BaseModel):
    """Request to create a treatment."""
    name: str = Field(..., min_length=1, max_length=100)
    duration_minutes: int = Field(..., gt=0)
    price: float = Field(..., ge=0)
    description: str | None = None


class TreatmentUpdateRequest(BaseModel):
    """Request to update a treatment."""
    name: str | None = Field(None, min_length=1, max_length=100)
    duration_minutes: int | None = Field(None, gt=0)
    price: float | None = Field(None, ge=0)
    description: str | None = None


class TreatmentResponse(BaseModel):
    """Treatment response."""
    id: int
    name: str
    duration_minutes: int
    price: float
    description: str | None
    links: list[HATEOASLink] = Field(default_factory=list)


class AppointmentCreateRequest(BaseModel):
    """Request to create an appointment."""
    pet_id: int = Field(..., gt=0)
    treatment_id: int = Field(..., gt=0)
    scheduled_at: datetime
    notes: str | None = None


class AppointmentUpdateRequest(BaseModel):
    """Request to update an appointment."""
    scheduled_at: datetime | None = None
    status: AppointmentStatus | None = None
    notes: str | None = None


class AppointmentResponse(BaseModel):
    """Appointment response."""
    id: int
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    status: AppointmentStatus
    notes: str | None
    created_at: datetime
    links: list[HATEOASLink] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    """Error response."""
    code: str
    message: str
    details: dict[str, Any]
    timestamp: datetime
    trace_id: int
    suggestion: str
