"""Schedule-related domain events."""
from dataclasses import dataclass
from domain.events.base import DomainEvent


@dataclass(frozen=True)
class ScheduleCreated(DomainEvent):
    """Event emitted when schedule is created."""
    
    event_type: str = "schedule.created"


@dataclass(frozen=True)
class ScheduleUpdated(DomainEvent):
    """Event emitted when schedule is updated."""
    
    event_type: str = "schedule.updated"


@dataclass(frozen=True)
class ScheduleDeleted(DomainEvent):
    """Event emitted when schedule is deleted."""
    
    event_type: str = "schedule.deleted"


@dataclass(frozen=True)
class ScheduleEnabled(DomainEvent):
    """Event emitted when schedule is enabled."""
    
    event_type: str = "schedule.enabled"


@dataclass(frozen=True)
class ScheduleDisabled(DomainEvent):
    """Event emitted when schedule is disabled."""
    
    event_type: str = "schedule.disabled"
