"""Appointment repository implementation."""
from datetime import date, datetime, timedelta
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.entities import Appointment
from ...domain.value_objects import AppointmentStatus
from ..database import AppointmentModel
from ..mappers import AppointmentMapper


class SqlAlchemyAppointmentRepository:
    """SQLAlchemy implementation of Appointment repository."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.
        
        Args:
            session: Database session
        Returns: None
        Raises: None
        """
        self.session = session
        self.mapper = AppointmentMapper()

    async def add(self, appointment: Appointment) -> Appointment:
        """Add new appointment.
        
        Args:
            appointment: Appointment entity
        Returns: Appointment with ID
        Raises: DatabaseError
        """
        model = self.mapper.to_model(appointment)
        self.session.add(model)
        await self.session.flush()
        return self.mapper.to_domain(model)

    async def get(self, id: int) -> Appointment | None:
        """Get appointment by ID.
        
        Args:
            id: Appointment ID
        Returns: Appointment or None
        Raises: DatabaseError
        """
        result = await self.session.get(AppointmentModel, id)
        if result is None:
            return None
        return self.mapper.to_domain(result)

    async def list_all(self) -> list[Appointment]:
        """List all appointments.
        
        Args: None
        Returns: List of appointments
        Raises: DatabaseError
        """
        result = await self.session.execute(select(AppointmentModel))
        models = result.scalars().all()
        return [self.mapper.to_domain(m) for m in models]

    async def filter_by_date(self, date: date) -> list[Appointment]:
        """Filter appointments by date.
        
        Args:
            date: Date to filter
        Returns: List of appointments
        Raises: DatabaseError
        """
        start = datetime.combine(date, datetime.min.time())
        end = start + timedelta(days=1)
        stmt = select(AppointmentModel).where(
            and_(
                AppointmentModel.scheduled_at >= start,
                AppointmentModel.scheduled_at < end,
            )
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self.mapper.to_domain(m) for m in models]

    async def filter_by_pet(self, pet_id: int) -> list[Appointment]:
        """Filter appointments by pet.
        
        Args:
            pet_id: Pet ID
        Returns: List of appointments
        Raises: DatabaseError
        """
        stmt = select(AppointmentModel).where(AppointmentModel.pet_id == pet_id)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self.mapper.to_domain(m) for m in models]

    async def filter_by_status(self, status: AppointmentStatus) -> list[Appointment]:
        """Filter appointments by status.
        
        Args:
            status: Appointment status
        Returns: List of appointments
        Raises: DatabaseError
        """
        stmt = select(AppointmentModel).where(AppointmentModel.status == status)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self.mapper.to_domain(m) for m in models]

    async def update(self, appointment: Appointment) -> Appointment:
        """Update appointment.
        
        Args:
            appointment: Appointment entity
        Returns: Updated appointment
        Raises: DatabaseError
        """
        model = await self.session.get(AppointmentModel, appointment.id)
        model.scheduled_at = appointment.scheduled_at
        model.status = appointment.status
        model.notes = appointment.notes
        await self.session.flush()
        return self.mapper.to_domain(model)

    async def delete(self, id: int) -> None:
        """Delete appointment.
        
        Args:
            id: Appointment ID
        Returns: None
        Raises: DatabaseError
        """
        model = await self.session.get(AppointmentModel, id)
        await self.session.delete(model)
        await self.session.flush()

    async def get_overlapping(
        self, start: datetime, end: datetime, exclude_id: int | None = None
    ) -> list[Appointment]:
        """Get overlapping appointments.
        
        Args:
            start: Start datetime
            end: End datetime
            exclude_id: ID to exclude from results
        Returns: List of overlapping appointments
        Raises: DatabaseError
        """
        stmt = select(AppointmentModel).where(
            and_(
                AppointmentModel.scheduled_at < end,
                AppointmentModel.scheduled_at >= start,
                AppointmentModel.status != AppointmentStatus.CANCELLED,
            )
        )
        if exclude_id is not None:
            stmt = stmt.where(AppointmentModel.id != exclude_id)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self.mapper.to_domain(m) for m in models]
