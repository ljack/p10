"""Device-related domain events."""
from dataclasses import dataclass
from typing import Any
from domain.events.base import DomainEvent


@dataclass(frozen=True)
class DeviceCreated(DomainEvent):
    """Event emitted when device is created."""
    
    event_type: str = "device.created"


@dataclass(frozen=True)
class DeviceUpdated(DomainEvent):
    """Event emitted when device is updated."""
    
    event_type: str = "device.updated"


@dataclass(frozen=True)
class DeviceDeleted(DomainEvent):
    """Event emitted when device is deleted."""
    
    event_type: str = "device.deleted"


@dataclass(frozen=True)
class DeviceActivated(DomainEvent):
    """Event emitted when device is activated."""
    
    event_type: str = "device.activated"


@dataclass(frozen=True)
class DeviceDeactivated(DomainEvent):
    """Event emitted when device is deactivated."""
    
    event_type: str = "device.deactivated"
