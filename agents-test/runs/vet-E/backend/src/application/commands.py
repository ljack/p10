"""CQRS Commands for write operations."""
from dataclasses import dataclass
from datetime import datetime

from ..domain.value_objects import Species, AppointmentStatus


@dataclass(frozen=True)
class CreatePetCommand:
    """Command to create a pet."""
    name: str
    species: Species
    age_years: float
    owner_name: str
    owner_phone: str
    breed: str | None = None
    notes: str | None = None


@dataclass(frozen=True)
class UpdatePetCommand:
    """Command to update a pet."""
    id: int
    name: str | None = None
    species: Species | None = None
    age_years: float | None = None
    owner_name: str | None = None
    owner_phone: str | None = None
    breed: str | None = None
    notes: str | None = None


@dataclass(frozen=True)
class DeletePetCommand:
    """Command to delete a pet."""
    id: int


@dataclass(frozen=True)
class CreateTreatmentCommand:
    """Command to create a treatment."""
    name: str
    duration_minutes: int
    price: float
    description: str | None = None


@dataclass(frozen=True)
class UpdateTreatmentCommand:
    """Command to update a treatment."""
    id: int
    name: str | None = None
    duration_minutes: int | None = None
    price: float | None = None
    description: str | None = None


@dataclass(frozen=True)
class DeleteTreatmentCommand:
    """Command to delete a treatment."""
    id: int


@dataclass(frozen=True)
class CreateAppointmentCommand:
    """Command to create an appointment."""
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    notes: str | None = None


@dataclass(frozen=True)
class UpdateAppointmentCommand:
    """Command to update an appointment."""
    id: int
    scheduled_at: datetime | None = None
    status: AppointmentStatus | None = None
    notes: str | None = None


@dataclass(frozen=True)
class DeleteAppointmentCommand:
    """Command to cancel an appointment."""
    id: int
    reason: str | None = None
