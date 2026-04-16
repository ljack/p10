"""Consumption-related domain events."""
from dataclasses import dataclass
from domain.events.base import DomainEvent


@dataclass(frozen=True)
class ConsumptionLogged(DomainEvent):
    """Event emitted when consumption is logged."""
    
    event_type: str = "consumption.logged"


@dataclass(frozen=True)
class ConsumptionUpdated(DomainEvent):
    """Event emitted when consumption is updated."""
    
    event_type: str = "consumption.updated"


@dataclass(frozen=True)
class ConsumptionDeleted(DomainEvent):
    """Event emitted when consumption is deleted."""
    
    event_type: str = "consumption.deleted"
