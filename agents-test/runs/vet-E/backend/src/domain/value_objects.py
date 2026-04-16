"""Domain value objects."""
from enum import Enum


class Species(str, Enum):
    """Pet species enumeration."""
    DOG = "dog"
    CAT = "cat"
    BIRD = "bird"
    RABBIT = "rabbit"
    OTHER = "other"


class AppointmentStatus(str, Enum):
    """Appointment status enumeration."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
