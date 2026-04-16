"""Appointment command handlers."""
from datetime import timedelta

from ...domain.protocols import AppointmentRepository, TreatmentRepository, UnitOfWork
from ...domain.factories import AppointmentFactory
from ...domain.strategies import SchedulingStrategy
from ...domain.entities import Appointment
from ...domain.exceptions import EntityNotFoundError
from ...domain.value_objects import AppointmentStatus
from ..commands import CreateAppointmentCommand, UpdateAppointmentCommand, DeleteAppointmentCommand


class CreateAppointmentHandler:
    """Handler for creating an appointment."""

    def __init__(
        self,
        repository: AppointmentRepository,
        treatment_repository: TreatmentRepository,
        factory: AppointmentFactory,
        strategy: SchedulingStrategy,
        uow: UnitOfWork,
    ) -> None:
        """Initialize handler.
        
        Args:
            repository: Appointment repository
            treatment_repository: Treatment repository
            factory: Appointment factory
            strategy: Scheduling strategy
            uow: Unit of work
        Returns: None
        Raises: None
        """
        self.repository = repository
        self.treatment_repository = treatment_repository
        self.factory = factory
        self.strategy = strategy
        self.uow = uow

    async def __call__(self, command: CreateAppointmentCommand) -> Appointment:
        """Handle create appointment command.
        
        Args:
            command: Create appointment command
        Returns: Created appointment
        Raises: DomainError, EntityNotFoundError
        """
        async with self.uow:
            treatment = await self.treatment_repository.get(command.treatment_id)
            if treatment is None:
                raise EntityNotFoundError("Treatment", command.treatment_id)
            self.strategy.validate_schedule_time(command.scheduled_at)
            end_time = command.scheduled_at + timedelta(minutes=treatment.duration_minutes)
            existing = await self.repository.get_overlapping(
                command.scheduled_at, end_time
            )
            self.strategy.check_conflicts(
                command.scheduled_at, treatment.duration_minutes, existing
            )
            appointment = self.factory.create(
                pet_id=command.pet_id,
                treatment_id=command.treatment_id,
                scheduled_at=command.scheduled_at,
                notes=command.notes,
            )
            appointment = await self.repository.add(appointment)
            appointment.record_scheduled()
            await self.uow.commit()
            return appointment


class UpdateAppointmentHandler:
    """Handler for updating an appointment."""

    def __init__(
        self,
        repository: AppointmentRepository,
        treatment_repository: TreatmentRepository,
        strategy: SchedulingStrategy,
        uow: UnitOfWork,
    ) -> None:
        """Initialize handler.
        
        Args:
            repository: Appointment repository
            treatment_repository: Treatment repository
            strategy: Scheduling strategy
            uow: Unit of work
        Returns: None
        Raises: None
        """
        self.repository = repository
        self.treatment_repository = treatment_repository
        self.strategy = strategy
        self.uow = uow

    async def __call__(self, command: UpdateAppointmentCommand) -> Appointment:
        """Handle update appointment command.
        
        Args:
            command: Update appointment command
        Returns: Updated appointment
        Raises: EntityNotFoundError
        """
        async with self.uow:
            appointment = await self.repository.get(command.id)
            if appointment is None:
                raise EntityNotFoundError("Appointment", command.id)
            if command.scheduled_at:
                await self._reschedule(appointment, command.scheduled_at)
            if command.status:
                appointment.change_status(command.status)
            if command.notes is not None:
                appointment.notes = command.notes
            appointment = await self.repository.update(appointment)
            await self.uow.commit()
            return appointment

    async def _reschedule(self, appointment: Appointment, new_time) -> None:
        """Reschedule appointment.
        
        Args:
            appointment: Appointment to reschedule
            new_time: New scheduled time
        Returns: None
        Raises: DomainError
        """
        treatment = await self.treatment_repository.get(appointment.treatment_id)
        self.strategy.validate_schedule_time(new_time)
        end_time = new_time + timedelta(minutes=treatment.duration_minutes)
        existing = await self.repository.get_overlapping(new_time, end_time, appointment.id)
        self.strategy.check_conflicts(new_time, treatment.duration_minutes, existing)
        appointment.reschedule(new_time)


class DeleteAppointmentHandler:
    """Handler for deleting/cancelling an appointment."""

    def __init__(self, repository: AppointmentRepository, uow: UnitOfWork) -> None:
        """Initialize handler.
        
        Args:
            repository: Appointment repository
            uow: Unit of work
        Returns: None
        Raises: None
        """
        self.repository = repository
        self.uow = uow

    async def __call__(self, command: DeleteAppointmentCommand) -> None:
        """Handle delete appointment command.
        
        Args:
            command: Delete appointment command
        Returns: None
        Raises: EntityNotFoundError
        """
        async with self.uow:
            appointment = await self.repository.get(command.id)
            if appointment is None:
                raise EntityNotFoundError("Appointment", command.id)
            appointment.change_status(AppointmentStatus.CANCELLED)
            await self.repository.update(appointment)
            await self.uow.commit()
