"""Device repository port."""
from typing import Protocol
from domain.entities.device import Device


class DeviceRepositoryPort(Protocol):
    """Port for device repository operations."""
    
    async def add(self, device: Device) -> Device:
        """Add a new device.
        
        Args:
            device: Device to add
            
        Returns:
            Device with assigned ID
        """
        ...
    
    async def get_by_id(self, device_id: int) -> Device | None:
        """Get device by ID.
        
        Args:
            device_id: Device identifier
            
        Returns:
            Device if found, None otherwise
        """
        ...
    
    async def get_all(self) -> list[Device]:
        """Get all devices.
        
        Returns:
            List of all devices
        """
        ...
    
    async def update(self, device: Device) -> Device:
        """Update existing device.
        
        Args:
            device: Device to update
            
        Returns:
            Updated device
        """
        ...
    
    async def delete(self, device_id: int) -> None:
        """Delete device by ID.
        
        Args:
            device_id: Device identifier
        """
        ...
    
    async def find_by_type(self, device_type: str) -> list[Device]:
        """Find devices by type.
        
        Args:
            device_type: Device type to filter by
            
        Returns:
            List of matching devices
        """
        ...
    
    async def find_by_location(self, location: str) -> list[Device]:
        """Find devices by location.
        
        Args:
            location: Location to filter by
            
        Returns:
            List of matching devices
        """
        ...
