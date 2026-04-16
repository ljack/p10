"""Consumption log domain entity."""
from dataclasses import dataclass, field
from datetime import datetime
from domain.value_objects.duration import Duration
from domain.events.base import DomainEvent


@dataclass
class ConsumptionLog:
    """Consumption log entity tracking device energy usage."""
    
    id: int | None
    device_id: int
    started_at: datetime
    duration: Duration
    kwh: float
    recorded_at: datetime = field(default_factory=datetime.utcnow)
    _events: list[DomainEvent] = field(default_factory=list, repr=False)
    
    @staticmethod
    def calculate_kwh(wattage: int, duration_minutes: int) -> float:
        """Calculate kWh from wattage and duration.
        
        Args:
            wattage: Device wattage in watts
            duration_minutes: Duration in minutes
            
        Returns:
            Energy consumption in kWh
        """
        return wattage * duration_minutes / 60 / 1000
    
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
