"""Domain entities with event sourcing."""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .events import DomainEvent, PetCreated, PetUpdated, TreatmentCreated, TreatmentUpdated
from .events import AppointmentScheduled, AppointmentStatusChanged, AppointmentRescheduled
from .value_objects import Species, AppointmentStatus


@dataclass
class Pet:
    """Pet aggregate root."""
    id: int | None
    name: str
    species: Species
    breed: str | None
    age_years: float
    owner_name: str
    owner_phone: str
    notes: str | None
    events: list[DomainEvent] = field(default_factory=list, repr=False)

    def record_created(self) -> None:
        """Record pet created event.
        
        Args: None
        Returns: None
        Raises: None
        """
        if self.id is None:
            return
        event = PetCreated(
            occurred_at=datetime.utcnow(),
            aggregate_id=self.id,
            event_type="PetCreated",
            name=self.name,
            species=self.species.value,
            owner_name=self.owner_name,
        )
        self.events.append(event)

    def record_updated(self, fields: dict[str, Any]) -> None:
        """Record pet updated event.
        
        Args:
            fields: Dictionary of updated fields
        Returns: None
        Raises: None
        """
        if self.id is None:
            return
        event = PetUpdated(
            occurred_at=datetime.utcnow(),
            aggregate_id=self.id,
            event_type="PetUpdated",
            fields=fields,
        )
        self.events.append(event)


@dataclass
class Treatment:
    """Treatment aggregate root."""
    id: int | None
    name: str
    duration_minutes: int
    description: str | None
    price: float
    events: list[DomainEvent] = field(default_factory=list, repr=False)

    def record_created(self) -> None:
        """Record treatment created event.
        
        Args: None
        Returns: None
        Raises: None
        """
        if self.id is None:
            return
        event = TreatmentCreated(
            occurred_at=datetime.utcnow(),
            aggregate_id=self.id,
            event_type="TreatmentCreated",
            name=self.name,
            duration_minutes=self.duration_minutes,
        )
        self.events.append(event)

    def record_updated(self, fields: dict[str, Any]) -> None:
        """Record treatment updated event.
        
        Args:
            fields: Dictionary of updated fields
        Returns: None
        Raises: None
        """
        if self.id is None:
            return
        event = TreatmentUpdated(
            occurred_at=datetime.utcnow(),
            aggregate_id=self.id,
            event_type="TreatmentUpdated",
            fields=fields,
        )
        self.events.append(event)


@dataclass
class Appointment:
    """Appointment aggregate root."""
    id: int | None
    pet_id: int
    treatment_id: int
    scheduled_at: datetime
    status: AppointmentStatus
    notes: str | None
    created_at: datetime
    events: list[DomainEvent] = field(default_factory=list, repr=False)

    def record_scheduled(self) -> None:
        """Record appointment scheduled event.
        
        Args: None
        Returns: None
        Raises: None
        """
        if self.id is None:
            return
        event = AppointmentScheduled(
            occurred_at=datetime.utcnow(),
            aggregate_id=self.id,
            event_type="AppointmentScheduled",
            pet_id=self.pet_id,
            treatment_id=self.treatment_id,
            scheduled_at=self.scheduled_at,
        )
        self.events.append(event)

    def change_status(self, new_status: AppointmentStatus) -> None:
        """Change appointment status.
        
        Args:
            new_status: New status value
        Returns: None
        Raises: None
        """
        if self.id is None:
            return
        old_status = self.status
        self.status = new_status
        event = AppointmentStatusChanged(
            occurred_at=datetime.utcnow(),
            aggregate_id=self.id,
            event_type="AppointmentStatusChanged",
            old_status=old_status.value,
            new_status=new_status.value,
        )
        self.events.append(event)

    def reschedule(self, new_time: datetime) -> None:
        """Reschedule appointment.
        
        Args:
            new_time: New scheduled time
        Returns: None
        Raises: None
        """
        if self.id is None:
            return
        old_time = self.scheduled_at
        self.scheduled_at = new_time
        event = AppointmentRescheduled(
            occurred_at=datetime.utcnow(),
            aggregate_id=self.id,
            event_type="AppointmentRescheduled",
            old_time=old_time,
            new_time=new_time,
        )
        self.events.append(event)
