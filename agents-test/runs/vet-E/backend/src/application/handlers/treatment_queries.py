"""Treatment query handlers."""
from ...domain.protocols import TreatmentRepository
from ...domain.entities import Treatment
from ...domain.exceptions import EntityNotFoundError
from ..queries import GetTreatmentQuery, ListTreatmentsQuery


class GetTreatmentQueryHandler:
    """Handler for getting a treatment by ID."""

    def __init__(self, repository: TreatmentRepository) -> None:
        """Initialize handler.
        
        Args:
            repository: Treatment repository
        Returns: None
        Raises: None
        """
        self.repository = repository

    async def __call__(self, query: GetTreatmentQuery) -> Treatment:
        """Handle get treatment query.
        
        Args:
            query: Get treatment query
        Returns: Treatment entity
        Raises: EntityNotFoundError
        """
        treatment = await self.repository.get(query.id)
        if treatment is None:
            raise EntityNotFoundError("Treatment", query.id)
        return treatment


class ListTreatmentsQueryHandler:
    """Handler for listing treatments."""

    def __init__(self, repository: TreatmentRepository) -> None:
        """Initialize handler.
        
        Args:
            repository: Treatment repository
        Returns: None
        Raises: None
        """
        self.repository = repository

    async def __call__(self, query: ListTreatmentsQuery) -> list[Treatment]:
        """Handle list treatments query.
        
        Args:
            query: List treatments query
        Returns: List of treatments
        Raises: None
        """
        return await self.repository.list_all()
