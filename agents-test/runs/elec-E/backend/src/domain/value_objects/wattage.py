"""Wattage value object."""
from dataclasses import dataclass
from domain.exceptions import InvalidWattageError


@dataclass(frozen=True)
class Wattage:
    """Immutable wattage value in watts."""
    
    value: int
    
    def __post_init__(self) -> None:
        """Validate wattage value.
        
        Raises:
            InvalidWattageError: If wattage is not positive
        """
        if self.value <= 0:
            raise InvalidWattageError(self.value)
    
    def to_kwh(self, duration_minutes: int) -> float:
        """Calculate kWh from wattage and duration.
        
        Args:
            duration_minutes: Duration in minutes
            
        Returns:
            Energy consumption in kWh
        """
        return self.value * duration_minutes / 60 / 1000
