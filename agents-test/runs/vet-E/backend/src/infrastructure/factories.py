"""Factory implementations."""
from datetime import datetime

from ..domain.entities import Pet, Treatment, Appointment
from ..domain.value_objects import Species, AppointmentStatus
from ..domain.exceptions import ValidationError


class PetFactoryImpl:
    """Pet factory implementation."""

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
        Raises: ValidationError
        """
        if not name or not name.strip():
            raise ValidationError("name", "Name cannot be empty")
        if age_years < 0:
            raise ValidationError("age_years", "Age cannot be negative")
        if not owner_name or not owner_name.strip():
            raise ValidationError("owner_name", "Owner name cannot be empty")
        if not owner_phone or not owner_phone.strip():
            raise ValidationError("owner_phone", "Owner phone cannot be empty")
        return Pet(
            id=None,
            name=name.strip(),
            species=species,
            breed=breed.strip() if breed else None,
            age_years=age_years,
            owner_name=owner_name.strip(),
            owner_phone=owner_phone.strip(),
            notes=notes.strip() if notes else None,
        )


class TreatmentFactoryImpl:
    """Treatment factory implementation."""

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
        Raises: ValidationError
        """
        if not name or not name.strip():
            raise ValidationError("name", "Name cannot be empty")
        if duration_minutes <= 0:
            raise ValidationError("duration_minutes", "Duration must be positive")
        if price < 0:
            raise ValidationError("price", "Price cannot be negative")
        return Treatment(
            id=None,
            name=name.strip(),
            duration_minutes=duration_minutes,
            description=description.strip() if description else None,
            price=price,
        )


class AppointmentFactoryImpl:
    """Appointment factory implementation."""

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
        Raises: ValidationError
        """
        if pet_id <= 0:
            raise ValidationError("pet_id", "Pet ID must be positive")
        if treatment_id <= 0:
            raise ValidationError("treatment_id", "Treatment ID must be positive")
        return Appointment(
            id=None,
            pet_id=pet_id,
            treatment_id=treatment_id,
            scheduled_at=scheduled_at,
            status=AppointmentStatus.SCHEDULED,
            notes=notes.strip() if notes else None,
            created_at=datetime.utcnow(),
        )
