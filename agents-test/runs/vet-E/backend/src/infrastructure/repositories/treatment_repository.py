"""Treatment repository implementation."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.entities import Treatment
from ..database import TreatmentModel
from ..mappers import TreatmentMapper


class SqlAlchemyTreatmentRepository:
    """SQLAlchemy implementation of Treatment repository."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.
        
        Args:
            session: Database session
        Returns: None
        Raises: None
        """
        self.session = session
        self.mapper = TreatmentMapper()

    async def add(self, treatment: Treatment) -> Treatment:
        """Add new treatment.
        
        Args:
            treatment: Treatment entity
        Returns: Treatment with ID
        Raises: DatabaseError
        """
        model = self.mapper.to_model(treatment)
        self.session.add(model)
        await self.session.flush()
        return self.mapper.to_domain(model)

    async def get(self, id: int) -> Treatment | None:
        """Get treatment by ID.
        
        Args:
            id: Treatment ID
        Returns: Treatment or None
        Raises: DatabaseError
        """
        result = await self.session.get(TreatmentModel, id)
        if result is None:
            return None
        return self.mapper.to_domain(result)

    async def list_all(self) -> list[Treatment]:
        """List all treatments.
        
        Args: None
        Returns: List of treatments
        Raises: DatabaseError
        """
        result = await self.session.execute(select(TreatmentModel))
        models = result.scalars().all()
        return [self.mapper.to_domain(m) for m in models]

    async def update(self, treatment: Treatment) -> Treatment:
        """Update treatment.
        
        Args:
            treatment: Treatment entity
        Returns: Updated treatment
        Raises: DatabaseError
        """
        model = await self.session.get(TreatmentModel, treatment.id)
        model.name = treatment.name
        model.duration_minutes = treatment.duration_minutes
        model.description = treatment.description
        model.price = treatment.price
        await self.session.flush()
        return self.mapper.to_domain(model)

    async def delete(self, id: int) -> None:
        """Delete treatment.
        
        Args:
            id: Treatment ID
        Returns: None
        Raises: DatabaseError
        """
        model = await self.session.get(TreatmentModel, id)
        await self.session.delete(model)
        await self.session.flush()
