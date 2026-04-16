"""Pet command handlers."""
from typing import Any

from ...domain.protocols import PetRepository, UnitOfWork
from ...domain.factories import PetFactory
from ...domain.entities import Pet
from ...domain.exceptions import EntityNotFoundError
from ..commands import CreatePetCommand, UpdatePetCommand, DeletePetCommand


class CreatePetHandler:
    """Handler for creating a pet."""

    def __init__(
        self, repository: PetRepository, factory: PetFactory, uow: UnitOfWork
    ) -> None:
        """Initialize handler.
        
        Args:
            repository: Pet repository
            factory: Pet factory
            uow: Unit of work
        Returns: None
        Raises: None
        """
        self.repository = repository
        self.factory = factory
        self.uow = uow

    async def __call__(self, command: CreatePetCommand) -> Pet:
        """Handle create pet command.
        
        Args:
            command: Create pet command
        Returns: Created pet
        Raises: DomainError
        """
        async with self.uow:
            pet = self.factory.create(
                name=command.name,
                species=command.species,
                age_years=command.age_years,
                owner_name=command.owner_name,
                owner_phone=command.owner_phone,
                breed=command.breed,
                notes=command.notes,
            )
            pet = await self.repository.add(pet)
            pet.record_created()
            await self.uow.commit()
            return pet


class UpdatePetHandler:
    """Handler for updating a pet."""

    def __init__(self, repository: PetRepository, uow: UnitOfWork) -> None:
        """Initialize handler.
        
        Args:
            repository: Pet repository
            uow: Unit of work
        Returns: None
        Raises: None
        """
        self.repository = repository
        self.uow = uow

    async def __call__(self, command: UpdatePetCommand) -> Pet:
        """Handle update pet command.
        
        Args:
            command: Update pet command
        Returns: Updated pet
        Raises: EntityNotFoundError
        """
        async with self.uow:
            pet = await self.repository.get(command.id)
            if pet is None:
                raise EntityNotFoundError("Pet", command.id)
            updates = self._build_updates(command)
            for field, value in updates.items():
                setattr(pet, field, value)
            pet = await self.repository.update(pet)
            pet.record_updated(updates)
            await self.uow.commit()
            return pet

    def _build_updates(self, command: UpdatePetCommand) -> dict[str, Any]:
        """Build update dictionary.
        
        Args:
            command: Update command
        Returns: Update dictionary
        Raises: None
        """
        updates = {}
        for field in ["name", "species", "age_years", "owner_name", "owner_phone", "breed", "notes"]:
            value = getattr(command, field)
            if value is not None:
                updates[field] = value
        return updates


class DeletePetHandler:
    """Handler for deleting a pet."""

    def __init__(self, repository: PetRepository, uow: UnitOfWork) -> None:
        """Initialize handler.
        
        Args:
            repository: Pet repository
            uow: Unit of work
        Returns: None
        Raises: None
        """
        self.repository = repository
        self.uow = uow

    async def __call__(self, command: DeletePetCommand) -> None:
        """Handle delete pet command.
        
        Args:
            command: Delete pet command
        Returns: None
        Raises: EntityNotFoundError
        """
        async with self.uow:
            pet = await self.repository.get(command.id)
            if pet is None:
                raise EntityNotFoundError("Pet", command.id)
            await self.repository.delete(command.id)
            await self.uow.commit()
