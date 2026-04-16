"""Device factory."""
from datetime import datetime
from domain.entities.device import Device
from domain.value_objects.device_type import DeviceType
from domain.value_objects.wattage import Wattage
from domain.exceptions import InvalidDeviceTypeError


class DeviceFactory:
    """Factory for creating Device entities."""
    
    @staticmethod
    def create(
        name: str,
        device_type: str,
        wattage: int,
        location: str,
        device_id: int | None = None,
        is_active: bool = True,
        created_at: datetime | None = None,
    ) -> Device:
        """Create a new device.
        
        Args:
            name: Device name
            device_type: Type of device
            wattage: Power consumption in watts
            location: Device location
            device_id: Optional ID for existing device
            is_active: Active status
            created_at: Creation timestamp
            
        Returns:
            New Device instance
            
        Raises:
            InvalidDeviceTypeError: If device type is invalid
            InvalidWattageError: If wattage is invalid
        """
        if not DeviceType.is_valid(device_type):
            raise InvalidDeviceTypeError(device_type)
        
        return Device(
            id=device_id,
            name=name,
            type=DeviceType(device_type),
            wattage=Wattage(wattage),
            location=location,
            is_active=is_active,
            created_at=created_at or datetime.utcnow(),
        )
