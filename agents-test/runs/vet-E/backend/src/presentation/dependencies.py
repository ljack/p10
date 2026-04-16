"""Dependency injection."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from ..infrastructure.database import create_session_factory
from ..infrastructure.repositories.pet_repository import SqlAlchemyPetRepository
from ..infrastructure.repositories.treatment_repository import SqlAlchemyTreatmentRepository
from ..infrastructure.repositories.appointment_repository import SqlAlchemyAppointmentRepository
from ..infrastructure.uow import SqlAlchemyUnitOfWork
from ..infrastructure.factories import PetFactoryImpl, TreatmentFactoryImpl, AppointmentFactoryImpl
from ..domain.strategies import ClinicHoursStrategy
from ..application.mediator import Mediator


class DependencyContainer:
    """Dependency injection container."""

    def __init__(self, database_url: str) -> None:
        """Initialize container.
        
        Args:
            database_url: Database connection URL
        Returns: None
        Raises: None
        """
        self.database_url = database_url
        self.session_factory = create_session_factory(database_url)
        self.mediator = Mediator()
        self._setup_handlers()

    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session.
        
        Args: None
        Returns: Async session generator
        Raises: None
        """
        async with self.session_factory() as session:
            yield session

    def get_pet_repository(self, session: AsyncSession):
        """Get pet repository.
        
        Args:
            session: Database session
        Returns: Pet repository
        Raises: None
        """
        return SqlAlchemyPetRepository(session)

    def get_treatment_repository(self, session: AsyncSession):
        """Get treatment repository.
        
        Args:
            session: Database session
        Returns: Treatment repository
        Raises: None
        """
        return SqlAlchemyTreatmentRepository(session)

    def get_appointment_repository(self, session: AsyncSession):
        """Get appointment repository.
        
        Args:
            session: Database session
        Returns: Appointment repository
        Raises: None
        """
        return SqlAlchemyAppointmentRepository(session)

    def get_uow(self, session: AsyncSession):
        """Get unit of work.
        
        Args:
            session: Database session
        Returns: Unit of work
        Raises: None
        """
        return SqlAlchemyUnitOfWork(session)

    def get_pet_factory(self):
        """Get pet factory.
        
        Args: None
        Returns: Pet factory
        Raises: None
        """
        return PetFactoryImpl()

    def get_treatment_factory(self):
        """Get treatment factory.
        
        Args: None
        Returns: Treatment factory
        Raises: None
        """
        return TreatmentFactoryImpl()

    def get_appointment_factory(self):
        """Get appointment factory.
        
        Args: None
        Returns: Appointment factory
        Raises: None
        """
        return AppointmentFactoryImpl()

    def get_scheduling_strategy(self):
        """Get scheduling strategy.
        
        Args: None
        Returns: Scheduling strategy
        Raises: None
        """
        return ClinicHoursStrategy()

    def _setup_handlers(self) -> None:
        """Setup mediator handlers.
        
        Args: None
        Returns: None
        Raises: None
        """
        pass
