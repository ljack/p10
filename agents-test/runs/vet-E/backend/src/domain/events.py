"""Domain events for event sourcing."""
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class DomainEvent:
    """Base domain event."""
    occurred_at: datetime
    aggregate_id: int
    event_type: str


@dataclass(frozen=True)
class PetCreated(DomainEvent):
    """Pet was created."""
    name: str
    species: str
    owner_name: str


@dataclass(frozen=True)
class PetUpdated(DomainEvent):
    """Pet details were updated."""
    fields: dict[str, Any]


@dataclass(frozen=True)
class PetDeleted(DomainEvent):
    """Pet was deleted."""
    pass


@dataclass(frozen=True)
class TreatmentCreated(DomainEvent):
    """Treatment was created."""
    name: str
    duration_minutes: int


@dataclass(frozen=True)
class TreatmentUpdated(DomainEvent):
    """Treatment was updated."""
    fields: dict[str, Any]


@dataclass(frozen=True)
class TreatmentDeleted(DomainEvent):
    """Treatment was deleted."""
    pass


@dataclass(frozen=True)
class AppointmentScheduled(DomainEvent):
    """Appointment was scheduled."""
    pet_id: int
    treatment_id: int
    scheduled_at: datetime


@dataclass(frozen=True)
class AppointmentRescheduled(DomainEvent):
    """Appointment was rescheduled."""
    old_time: datetime
    new_time: datetime


@dataclass(frozen=True)
class AppointmentStatusChanged(DomainEvent):
    """Appointment status changed."""
    old_status: str
    new_status: str


@dataclass(frozen=True)
class AppointmentCancelled(DomainEvent):
    """Appointment was cancelled."""
    reason: str | None
