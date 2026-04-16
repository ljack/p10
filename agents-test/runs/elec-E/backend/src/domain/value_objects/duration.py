"""Duration value object."""
from dataclasses import dataclass
from domain.exceptions import InvalidDurationError


@dataclass(frozen=True)
class Duration:
    """Immutable duration value in minutes."""
    
    minutes: int
    
    def __post_init__(self) -> None:
        """Validate duration value.
        
        Raises:
            InvalidDurationError: If duration is not positive
        """
        if self.minutes <= 0:
            raise InvalidDurationError(self.minutes)
    
    def to_hours(self) -> float:
        """Convert to hours.
        
        Returns:
            Duration in hours
        """
        return self.minutes / 60
