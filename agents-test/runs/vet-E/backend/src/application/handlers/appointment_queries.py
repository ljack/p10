"""Appointment query handlers."""
from datetime import datetime, time, timedelta

from ...domain.protocols import AppointmentRepository, TreatmentRepository
from ...domain.entities import Appointment
from ...domain.exceptions import EntityNotFoundError
from ..queries import GetAppointmentQuery, ListAppointmentsQuery, GetAvailableSlotsQuery


class GetAppointmentQueryHandler:
    """Handler for getting an appointment by ID."""

    def __init__(self, repository: AppointmentRepository) -> None:
        """Initialize handler.
        
        Args:
            repository: Appointment repository
        Returns: None
        Raises: None
        """
        self.repository = repository

    async def __call__(self, query: GetAppointmentQuery) -> Appointment:
        """Handle get appointment query.
        
        Args:
            query: Get appointment query
        Returns: Appointment entity
        Raises: EntityNotFoundError
        """
        appointment = await self.repository.get(query.id)
        if appointment is None:
            raise EntityNotFoundError("Appointment", query.id)
        return appointment


class ListAppointmentsQueryHandler:
    """Handler for listing appointments."""

    def __init__(self, repository: AppointmentRepository) -> None:
        """Initialize handler.
        
        Args:
            repository: Appointment repository
        Returns: None
        Raises: None
        """
        self.repository = repository

    async def __call__(self, query: ListAppointmentsQuery) -> list[Appointment]:
        """Handle list appointments query.
        
        Args:
            query: List appointments query
        Returns: List of appointments
        Raises: None
        """
        if query.date:
            return await self.repository.filter_by_date(query.date)
        if query.pet_id:
            return await self.repository.filter_by_pet(query.pet_id)
        if query.status:
            return await self.repository.filter_by_status(query.status)
        return await self.repository.list_all()


class GetAvailableSlotsQueryHandler:
    """Handler for getting available appointment slots."""

    def __init__(
        self,
        appointment_repository: AppointmentRepository,
        treatment_repository: TreatmentRepository,
        slot_interval: int = 30,
    ) -> None:
        """Initialize handler.
        
        Args:
            appointment_repository: Appointment repository
            treatment_repository: Treatment repository
            slot_interval: Slot interval in minutes
        Returns: None
        Raises: None
        """
        self.appointment_repository = appointment_repository
        self.treatment_repository = treatment_repository
        self.slot_interval = slot_interval

    async def __call__(self, query: GetAvailableSlotsQuery) -> list[datetime]:
        """Handle get available slots query.
        
        Args:
            query: Get available slots query
        Returns: List of available datetime slots
        Raises: EntityNotFoundError
        \"\"\"
        treatment = await self.treatment_repository.get(query.treatment_id)
        if treatment is None:
            raise EntityNotFoundError(\"Treatment\", query.treatment_id)
        appointments = await self.appointment_repository.filter_by_date(query.date)
        all_slots = self._generate_slots(query.date)
        return self._filter_available(all_slots, appointments, treatment.duration_minutes)

    def _generate_slots(self, date) -> list[datetime]:
        \"\"\"Generate all possible slots for a date.
        
        Args:
            date: Date to generate slots for
        Returns: List of datetime slots
        Raises: None
        \"\"\"
        slots = []
        start = datetime.combine(date, time(8, 0))
        end = datetime.combine(date, time(17, 0))
        current = start
        while current < end:
            slots.append(current)
            current += timedelta(minutes=self.slot_interval)
        return slots

    def _filter_available(
        self, slots: list[datetime], appointments: list[Appointment], duration: int
    ) -> list[datetime]:
        \"\"\"Filter available slots.
        
        Args:
            slots: All possible slots
            appointments: Existing appointments
            duration: Treatment duration
        Returns: Available slots
        Raises: None
        \"\"\"
        available = []
        for slot in slots:
            if self._is_slot_available(slot, appointments, duration):
                available.append(slot)
        return available

    def _is_slot_available(
        self, slot: datetime, appointments: list[Appointment], duration: int
    ) -> bool:
        \"\"\"Check if slot is available.
        
        Args:
            slot: Slot to check
            appointments: Existing appointments
            duration: Treatment duration
        Returns: True if available
        Raises: None
        \"\"\"
        slot_end = slot + timedelta(minutes=duration)
        for appt in appointments:
            appt_end = appt.scheduled_at + timedelta(minutes=duration)
            if slot < appt_end and slot_end > appt.scheduled_at:
                return False
        return True
