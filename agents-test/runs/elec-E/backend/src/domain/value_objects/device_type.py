"""Device type value object."""
from enum import Enum


class DeviceType(str, Enum):
    """Valid device types."""
    
    LIGHTING = "lighting"
    HEATING = "heating"
    COOLING = "cooling"
    APPLIANCE = "appliance"
    ELECTRONICS = "electronics"
    OTHER = "other"
    
    @classmethod
    def is_valid(cls, value: str) -> bool:
        """Check if value is valid device type.
        
        Args:
            value: Type string to validate
            
        Returns:
            True if valid, False otherwise
        """
        return value in cls._value2member_map_
