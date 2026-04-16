"""Domain factory protocols."""
from datetime import datetime
from typing import Protocol

from .entities import Pet, Treatment, Appointment
from .value_objects import Species, AppointmentStatus


class PetFactory(Protocol):
    """Pet factory protocol."""

    def create(
        self,
        name: str,
        species: Species,
        age_years: float,
        owner_name: str,
        owner_phone: str,
        breed: str | None = None,
        notes: str | None = None,
    ) -> Pet:
        """Create new pet entity.
        
        Args:
            name: Pet name
            species: Pet species
            age_years: Pet age in years
            owner_name: Owner name
            owner_phone: Owner phone
            breed: Pet breed (optional)
            notes: Additional notes (optional)
        Returns: Pet entity
        Raises: DomainError
        """
        ...


class TreatmentFactory(Protocol):
    """Treatment factory protocol."""

    def create(
        self,
        name: str,
        duration_minutes: int,
        price: float,
        description: str | None = None,
    ) -> Treatment:
        """Create new treatment entity.
        
        Args:
            name: Treatment name
            duration_minutes: Duration in minutes
            price: Treatment price
            description: Description (optional)
        Returns: Treatment entity
        Raises: DomainError
        """
        ...


class AppointmentFactory(Protocol):
    """Appointment factory protocol."""

    def create(
        self,
        pet_id: int,
        treatment_id: int,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> Appointment:
        """Create new appointment entity.
        
        Args:
            pet_id: Pet ID
            treatment_id: Treatment ID
            scheduled_at: Scheduled datetime
            notes: Additional notes (optional)
        Returns: Appointment entity
        Raises: DomainError
        """
        ...
