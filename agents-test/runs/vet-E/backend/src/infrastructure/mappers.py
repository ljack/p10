"""Mappers between domain entities and database models."""
from ..domain.entities import Pet, Treatment, Appointment
from ..domain.value_objects import Species, AppointmentStatus
from .database import PetModel, TreatmentModel, AppointmentModel


class PetMapper:
    """Mapper for Pet entity."""

    @staticmethod
    def to_domain(model: PetModel) -> Pet:
        """Convert database model to domain entity.
        
        Args:
            model: Database model
        Returns: Domain entity
        Raises: None
        """
        return Pet(
            id=model.id,
            name=model.name,
            species=model.species,
            breed=model.breed,
            age_years=model.age_years,
            owner_name=model.owner_name,
            owner_phone=model.owner_phone,
            notes=model.notes,
        )

    @staticmethod
    def to_model(entity: Pet) -> PetModel:
        """Convert domain entity to database model.
        
        Args:
            entity: Domain entity
        Returns: Database model
        Raises: None
        """
        return PetModel(
            id=entity.id,
            name=entity.name,
            species=entity.species,
            breed=entity.breed,
            age_years=entity.age_years,
            owner_name=entity.owner_name,
            owner_phone=entity.owner_phone,
            notes=entity.notes,
        )


class TreatmentMapper:
    """Mapper for Treatment entity."""

    @staticmethod
    def to_domain(model: TreatmentModel) -> Treatment:
        """Convert database model to domain entity.
        
        Args:
            model: Database model
        Returns: Domain entity
        Raises: None
        """
        return Treatment(
            id=model.id,
            name=model.name,
            duration_minutes=model.duration_minutes,
            description=model.description,
            price=model.price,
        )

    @staticmethod
    def to_model(entity: Treatment) -> TreatmentModel:
        """Convert domain entity to database model.
        
        Args:
            entity: Domain entity
        Returns: Database model
        Raises: None
        """
        return TreatmentModel(
            id=entity.id,
            name=entity.name,
            duration_minutes=entity.duration_minutes,
            description=entity.description,
            price=entity.price,
        )


class AppointmentMapper:
    """Mapper for Appointment entity."""

    @staticmethod
    def to_domain(model: AppointmentModel) -> Appointment:
        """Convert database model to domain entity.
        
        Args:
            model: Database model
        Returns: Domain entity
        Raises: None
        """
        return Appointment(
            id=model.id,
            pet_id=model.pet_id,
            treatment_id=model.treatment_id,
            scheduled_at=model.scheduled_at,
            status=model.status,
            notes=model.notes,
            created_at=model.created_at,
        )

    @staticmethod
    def to_model(entity: Appointment) -> AppointmentModel:
        """Convert domain entity to database model.
        
        Args:
            entity: Domain entity
        Returns: Database model
        Raises: None
        """
        return AppointmentModel(
            id=entity.id,
            pet_id=entity.pet_id,
            treatment_id=entity.treatment_id,
            scheduled_at=entity.scheduled_at,
            status=entity.status,
            notes=entity.notes,
            created_at=entity.created_at,
        )
