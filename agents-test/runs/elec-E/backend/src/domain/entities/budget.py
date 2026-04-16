"""Budget domain entity."""
from dataclasses import dataclass, field
from domain.events.base import DomainEvent


@dataclass
class Budget:
    """Budget entity for monthly electricity consumption budgets."""
    
    id: int | None
    year_month: str
    budget_kwh: float
    price_per_kwh: float
    alert_threshold_percent: int = 80
    _events: list[DomainEvent] = field(default_factory=list, repr=False)
    
    def is_threshold_exceeded(self, used_kwh: float) -> bool:
        """Check if usage exceeds alert threshold.
        
        Args:
            used_kwh: Current kWh usage
            
        Returns:
            True if threshold exceeded, False otherwise
        """
        usage_percent = (used_kwh / self.budget_kwh) * 100
        return usage_percent >= self.alert_threshold_percent
    
    def calculate_cost(self, kwh: float) -> float:
        """Calculate cost for given kWh.
        
        Args:
            kwh: Energy consumption in kWh
            
        Returns:
            Cost in EUR
        """
        return kwh * self.price_per_kwh
    
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
