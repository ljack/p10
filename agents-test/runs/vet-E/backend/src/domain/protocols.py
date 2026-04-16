"""Domain protocols (interfaces)."""
from datetime import date, datetime
from typing import Protocol, TypeVar, Generic

from .entities import Pet, Treatment, Appointment
from .value_objects import AppointmentStatus


T = TypeVar("T")


class Repository(Protocol[T]):
    """Generic repository protocol."""

    async def add(self, entity: T) -> T:
        """Add new entity.
        
        Args:
            entity: Entity to add
        Returns: Entity with ID assigned
        Raises: InfrastructureError
        """
        ...

    async def get(self, id: int) -> T | None:
        """Get entity by ID.
        
        Args:
            id: Entity ID
        Returns: Entity or None
        Raises: InfrastructureError
        """
        ...

    async def update(self, entity: T) -> T:
        """Update entity.
        
        Args:
            entity: Entity to update
        Returns: Updated entity
        Raises: InfrastructureError
        """
        ...

    async def delete(self, id: int) -> None:
        """Delete entity.
        
        Args:
            id: Entity ID
        Returns: None
        Raises: InfrastructureError
        """
        ...


class PetRepository(Protocol):
    """Pet repository protocol."""

    async def add(self, pet: Pet) -> Pet:
        """Add pet."""
        ...

    async def get(self, id: int) -> Pet | None:
        """Get pet by ID."""
        ...

    async def list_all(self) -> list[Pet]:
        """List all pets."""
        ...

    async def search_by_owner(self, owner_name: str) -> list[Pet]:
        """Search pets by owner name."""
        ...

    async def update(self, pet: Pet) -> Pet:
        """Update pet."""
        ...

    async def delete(self, id: int) -> None:
        """Delete pet."""
        ...


class TreatmentRepository(Protocol):
    """Treatment repository protocol."""

    async def add(self, treatment: Treatment) -> Treatment:
        """Add treatment."""
        ...

    async def get(self, id: int) -> Treatment | None:
        """Get treatment by ID."""
        ...

    async def list_all(self) -> list[Treatment]:
        """List all treatments."""
        ...

    async def update(self, treatment: Treatment) -> Treatment:
        """Update treatment."""
        ...

    async def delete(self, id: int) -> None:
        """Delete treatment."""
        ...


class AppointmentRepository(Protocol):
    """Appointment repository protocol."""

    async def add(self, appointment: Appointment) -> Appointment:
        """Add appointment."""
        ...

    async def get(self, id: int) -> Appointment | None:
        """Get appointment by ID."""
        ...

    async def list_all(self) -> list[Appointment]:
        """List all appointments."""
        ...

    async def filter_by_date(self, date: date) -> list[Appointment]:
        """Filter appointments by date."""
        ...

    async def filter_by_pet(self, pet_id: int) -> list[Appointment]:
        """Filter appointments by pet."""
        ...

    async def filter_by_status(self, status: AppointmentStatus) -> list[Appointment]:
        """Filter appointments by status."""
        ...

    async def update(self, appointment: Appointment) -> Appointment:
        """Update appointment."""
        ...

    async def delete(self, id: int) -> None:
        """Delete appointment."""
        ...

    async def get_overlapping(
        self, start: datetime, end: datetime, exclude_id: int | None = None
    ) -> list[Appointment]:
        """Get overlapping appointments."""
        ...


class UnitOfWork(Protocol):
    """Unit of work protocol."""

    async def __aenter__(self) -> "UnitOfWork":
        """Enter context."""
        ...

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Exit context."""
        ...

    async def commit(self) -> None:
        """Commit transaction."""
        ...

    async def rollback(self) -> None:
        """Rollback transaction."""
        ...
