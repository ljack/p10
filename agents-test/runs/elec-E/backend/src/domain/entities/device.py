"""Device domain entity."""
from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING
from domain.value_objects.device_type import DeviceType
from domain.value_objects.wattage import Wattage
from domain.events.base import DomainEvent

if TYPE_CHECKING:
    from domain.entities.consumption_log import ConsumptionLog


@dataclass
class Device:
    """Device entity representing an electricity-consuming device."""
    
    id: int | None
    name: str
    type: DeviceType
    wattage: Wattage
    location: str
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    _events: list[DomainEvent] = field(default_factory=list, repr=False)
    
    def deactivate(self) -> None:
        """Mark device as inactive (soft delete)."""
        self.is_active = False
    
    def activate(self) -> None:
        """Mark device as active."""
        self.is_active = True
    
    def update_name(self, name: str) -> None:
        """Update device name.
        
        Args:
            name: New device name
        """
        self.name = name
    
    def update_location(self, location: str) -> None:
        """Update device location.
        
        Args:
            location: New location
        """
        self.location = location
    
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
