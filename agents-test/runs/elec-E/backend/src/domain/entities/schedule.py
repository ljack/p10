"""Schedule domain entity."""
from dataclasses import dataclass, field
from datetime import time
from domain.events.base import DomainEvent


@dataclass
class Schedule:
    """Schedule entity for device automation."""
    
    id: int | None
    device_id: int
    day_of_week: int
    start_time: time
    end_time: time
    enabled: bool = True
    _events: list[DomainEvent] = field(default_factory=list, repr=False)
    
    def enable(self) -> None:
        """Enable the schedule."""
        self.enabled = True
    
    def disable(self) -> None:
        """Disable the schedule."""
        self.enabled = False
    
    def overlaps_with(self, other: "Schedule") -> bool:
        """Check if this schedule overlaps with another.
        
        Args:
            other: Another schedule to check against
            
        Returns:
            True if schedules overlap, False otherwise
        """
        if self.day_of_week != other.day_of_week:
            return False
        return not (self.end_time <= other.start_time or self.start_time >= other.end_time)
    
    def record_event(self, event: DomainEvent) -> None:
        """Record a domain event.
        
        Args:
            event: Event to record
        """
        self._events.append(event)
    
    def clear_events(self) -> list[DomainEvent]:
        """Clear and return recorded events.
        
        Returns:
            List of recorded events
        """
        events = self._events.copy()
        self._events.clear()
        return events
