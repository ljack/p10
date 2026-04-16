"""Treatment command handlers."""
from typing import Any

from ...domain.protocols import TreatmentRepository, UnitOfWork
from ...domain.factories import TreatmentFactory
from ...domain.entities import Treatment
from ...domain.exceptions import EntityNotFoundError
from ..commands import CreateTreatmentCommand, UpdateTreatmentCommand, DeleteTreatmentCommand


class CreateTreatmentHandler:
    """Handler for creating a treatment."""

    def __init__(
        self, repository: TreatmentRepository, factory: TreatmentFactory, uow: UnitOfWork
    ) -> None:
        """Initialize handler.
        
        Args:
            repository: Treatment repository
            factory: Treatment factory
            uow: Unit of work
        Returns: None
        Raises: None
        """
        self.repository = repository
        self.factory = factory
        self.uow = uow

    async def __call__(self, command: CreateTreatmentCommand) -> Treatment:
        """Handle create treatment command.
        
        Args:
            command: Create treatment command
        Returns: Created treatment
        Raises: DomainError
        """
        async with self.uow:
            treatment = self.factory.create(
                name=command.name,
                duration_minutes=command.duration_minutes,
                price=command.price,
                description=command.description,
            )
            treatment = await self.repository.add(treatment)
            treatment.record_created()
            await self.uow.commit()
            return treatment


class UpdateTreatmentHandler:
    """Handler for updating a treatment."""

    def __init__(self, repository: TreatmentRepository, uow: UnitOfWork) -> None:
        """Initialize handler.
        
        Args:
            repository: Treatment repository
            uow: Unit of work
        Returns: None
        Raises: None
        """
        self.repository = repository
        self.uow = uow

    async def __call__(self, command: UpdateTreatmentCommand) -> Treatment:
        """Handle update treatment command.
        
        Args:
            command: Update treatment command
        Returns: Updated treatment
        Raises: EntityNotFoundError
        """
        async with self.uow:
            treatment = await self.repository.get(command.id)
            if treatment is None:
                raise EntityNotFoundError("Treatment", command.id)
            updates = self._build_updates(command)
            for field, value in updates.items():
                setattr(treatment, field, value)
            treatment = await self.repository.update(treatment)
            treatment.record_updated(updates)
            await self.uow.commit()
            return treatment

    def _build_updates(self, command: UpdateTreatmentCommand) -> dict[str, Any]:
        \"\"\"Build update dictionary.
        
        Args:
            command: Update command
        Returns: Update dictionary
        Raises: None
        \"\"\"
        updates = {}
        for field in [\"name\", \"duration_minutes\", \"price\", \"description\"]:
            value = getattr(command, field)
            if value is not None:
                updates[field] = value
        return updates


class DeleteTreatmentHandler:
    \"\"\"Handler for deleting a treatment.\"\"\"

    def __init__(self, repository: TreatmentRepository, uow: UnitOfWork) -> None:
        \"\"\"Initialize handler.
        
        Args:
            repository: Treatment repository
            uow: Unit of work
        Returns: None
        Raises: None
        \"\"\"
        self.repository = repository
        self.uow = uow

    async def __call__(self, command: DeleteTreatmentCommand) -> None:
        \"\"\"Handle delete treatment command.
        
        Args:
            command: Delete treatment command
        Returns: None
        Raises: EntityNotFoundError
        \"\"\"
        async with self.uow:
            treatment = await self.repository.get(command.id)
            if treatment is None:
                raise EntityNotFoundError(\"Treatment\", command.id)
            await self.repository.delete(command.id)
            await self.uow.commit()
