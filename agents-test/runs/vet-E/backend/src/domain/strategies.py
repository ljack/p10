"""Business rule strategies."""
from datetime import datetime, time, timedelta
from typing import Protocol

from .entities import Appointment, Treatment
from .exceptions import BusinessRuleViolation


class SchedulingStrategy(Protocol):
    """Scheduling business rule strategy."""

    def validate_schedule_time(self, scheduled_at: datetime) -> None:
        """Validate scheduling time.
        
        Args:
            scheduled_at: Proposed schedule time
        Returns: None
        Raises: BusinessRuleViolation
        """
        ...

    def check_conflicts(
        self,
        scheduled_at: datetime,
        duration: int,
        existing: list[Appointment],
    ) -> None:
        """Check for scheduling conflicts.
        
        Args:
            scheduled_at: Proposed start time
            duration: Treatment duration in minutes
            existing: Existing appointments
        Returns: None
        Raises: BusinessRuleViolation
        """
        ...


class ClinicHoursStrategy:
    """Clinic hours business rule."""

    def __init__(
        self,
        open_time: time = time(8, 0),
        close_time: time = time(17, 0),
        work_days: set[int] = {0, 1, 2, 3, 4},
    ) -> None:
        """Initialize clinic hours strategy.
        
        Args:
            open_time: Clinic opening time
            close_time: Clinic closing time
            work_days: Working days (0=Mon, 6=Sun)
        Returns: None
        Raises: None
        """
        self.open_time = open_time
        self.close_time = close_time
        self.work_days = work_days

    def validate_schedule_time(self, scheduled_at: datetime) -> None:
        """Validate if time is within clinic hours.
        
        Args:
            scheduled_at: Proposed schedule time
        Returns: None
        Raises: BusinessRuleViolation
        """
        if scheduled_at.weekday() not in self.work_days:
            raise BusinessRuleViolation(
                rule="clinic_hours",
                message="Clinic is closed on this day",
            )
        appointment_time = scheduled_at.time()
        if not (self.open_time <= appointment_time < self.close_time):
            raise BusinessRuleViolation(
                rule="clinic_hours",
                message=f"Appointment must be between {self.open_time} and {self.close_time}",
            )

    def check_conflicts(
        self,
        scheduled_at: datetime,
        duration: int,
        existing: list[Appointment],
    ) -> None:
        """Check for appointment conflicts.
        
        Args:
            scheduled_at: Proposed start time
            duration: Treatment duration in minutes
            existing: Existing appointments
        Returns: None
        Raises: BusinessRuleViolation
        """
        end_time = scheduled_at + timedelta(minutes=duration)
        for appt in existing:
            appt_end = appt.scheduled_at + timedelta(minutes=duration)
            if self._times_overlap(scheduled_at, end_time, appt.scheduled_at, appt_end):
                raise BusinessRuleViolation(
                    rule="no_conflicts",
                    message="Appointment conflicts with existing booking",
                )

    def _times_overlap(
        self, start1: datetime, end1: datetime, start2: datetime, end2: datetime
    ) -> bool:
        \"\"\"Check if two time ranges overlap.
        
        Args:
            start1: First range start
            end1: First range end
            start2: Second range start
            end2: Second range end
        Returns: True if overlapping
        Raises: None
        \"\"\"
        return start1 < end2 and end1 > start2
