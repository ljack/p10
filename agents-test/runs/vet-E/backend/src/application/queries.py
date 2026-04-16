"""CQRS Queries for read operations."""
from dataclasses import dataclass
from datetime import date

from ..domain.value_objects import AppointmentStatus


@dataclass(frozen=True)
class GetPetQuery:
    """Query to get a pet by ID."""
    id: int


@dataclass(frozen=True)
class ListPetsQuery:
    """Query to list all pets."""
    owner_name: str | None = None


@dataclass(frozen=True)
class GetTreatmentQuery:
    """Query to get a treatment by ID."""
    id: int


@dataclass(frozen=True)
class ListTreatmentsQuery:
    """Query to list all treatments."""
    pass


@dataclass(frozen=True)
class GetAppointmentQuery:
    """Query to get an appointment by ID."""
    id: int


@dataclass(frozen=True)
class ListAppointmentsQuery:
    """Query to list appointments."""
    date: date | None = None
    pet_id: int | None = None
    status: AppointmentStatus | None = None


@dataclass(frozen=True)
class GetAvailableSlotsQuery:
    """Query to get available appointment slots."""
    date: date
    treatment_id: int
