"""Pet repository implementation."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.entities import Pet
from ..database import PetModel
from ..mappers import PetMapper


class SqlAlchemyPetRepository:
    """SQLAlchemy implementation of Pet repository."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.
        
        Args:
            session: Database session
        Returns: None
        Raises: None
        """
        self.session = session
        self.mapper = PetMapper()

    async def add(self, pet: Pet) -> Pet:
        """Add new pet.
        
        Args:
            pet: Pet entity
        Returns: Pet with ID
        Raises: DatabaseError
        """
        model = self.mapper.to_model(pet)
        self.session.add(model)
        await self.session.flush()
        return self.mapper.to_domain(model)

    async def get(self, id: int) -> Pet | None:
        """Get pet by ID.
        
        Args:
            id: Pet ID
        Returns: Pet or None
        Raises: DatabaseError
        """
        result = await self.session.get(PetModel, id)
        if result is None:
            return None
        return self.mapper.to_domain(result)

    async def list_all(self) -> list[Pet]:
        """List all pets.
        
        Args: None
        Returns: List of pets
        Raises: DatabaseError
        """
        result = await self.session.execute(select(PetModel))
        models = result.scalars().all()
        return [self.mapper.to_domain(m) for m in models]

    async def search_by_owner(self, owner_name: str) -> list[Pet]:
        """Search pets by owner name.
        
        Args:
            owner_name: Owner name to search
        Returns: List of matching pets
        Raises: DatabaseError
        """
        stmt = select(PetModel).where(PetModel.owner_name.contains(owner_name))
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self.mapper.to_domain(m) for m in models]

    async def update(self, pet: Pet) -> Pet:
        """Update pet.
        
        Args:
            pet: Pet entity
        Returns: Updated pet
        Raises: DatabaseError
        """
        model = await self.session.get(PetModel, pet.id)
        model.name = pet.name
        model.species = pet.species
        model.breed = pet.breed
        model.age_years = pet.age_years
        model.owner_name = pet.owner_name
        model.owner_phone = pet.owner_phone
        model.notes = pet.notes
        await self.session.flush()
        return self.mapper.to_domain(model)

    async def delete(self, id: int) -> None:
        """Delete pet.
        
        Args:
            id: Pet ID
        Returns: None
        Raises: DatabaseError
        """
        model = await self.session.get(PetModel, id)
        await self.session.delete(model)
        await self.session.flush()
