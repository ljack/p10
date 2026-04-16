"""Pet query handlers."""
from ...domain.protocols import PetRepository
from ...domain.entities import Pet
from ...domain.exceptions import EntityNotFoundError
from ..queries import GetPetQuery, ListPetsQuery


class GetPetQueryHandler:
    """Handler for getting a pet by ID."""

    def __init__(self, repository: PetRepository) -> None:
        """Initialize handler.
        
        Args:
            repository: Pet repository
        Returns: None
        Raises: None
        """
        self.repository = repository

    async def __call__(self, query: GetPetQuery) -> Pet:
        """Handle get pet query.
        
        Args:
            query: Get pet query
        Returns: Pet entity
        Raises: EntityNotFoundError
        """
        pet = await self.repository.get(query.id)
        if pet is None:
            raise EntityNotFoundError("Pet", query.id)
        return pet


class ListPetsQueryHandler:
    """Handler for listing pets."""

    def __init__(self, repository: PetRepository) -> None:
        """Initialize handler.
        
        Args:
            repository: Pet repository
        Returns: None
        Raises: None
        """
        self.repository = repository

    async def __call__(self, query: ListPetsQuery) -> list[Pet]:
        """Handle list pets query.
        
        Args:
            query: List pets query
        Returns: List of pets
        Raises: None
        """
        if query.owner_name:
            return await self.repository.search_by_owner(query.owner_name)
        return await self.repository.list_all()
