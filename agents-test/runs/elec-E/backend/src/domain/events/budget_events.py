"""Budget-related domain events."""
from dataclasses import dataclass
from domain.events.base import DomainEvent


@dataclass(frozen=True)
class BudgetCreated(DomainEvent):
    """Event emitted when budget is created."""
    
    event_type: str = "budget.created"


@dataclass(frozen=True)
class BudgetUpdated(DomainEvent):
    """Event emitted when budget is updated."""
    
    event_type: str = "budget.updated"


@dataclass(frozen=True)
class BudgetThresholdExceeded(DomainEvent):
    """Event emitted when budget threshold is exceeded."""
    
    event_type: str = "budget.threshold_exceeded"
