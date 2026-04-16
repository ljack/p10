"""Device repository implementation."""
from datetime import datetime
from domain.entities.device import Device
from domain.factories.device_factory import DeviceFactory
from infrastructure.database.connection import DatabaseConnection


class DeviceRepository:
    """SQLite implementation of device repository."""
    
    def __init__(self, db: DatabaseConnection) -> None:
        """Initialize repository.
        
        Args:
            db: Database connection
        """
        self.db = db
    
    async def add(self, device: Device) -> Device:
        """Add device to database.
        
        Args:
            device: Device to add
            
        Returns:
            Device with assigned ID
        """
        cursor = await self.db.execute(
            """INSERT INTO devices (name, type, wattage, location, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (device.name, device.type.value, device.wattage.value, 
             device.location, device.is_active, device.created_at)
        )
        device.id = cursor.lastrowid
        return device
    
    async def get_by_id(self, device_id: int) -> Device | None:
        """Get device by ID.
        
        Args:
            device_id: Device ID
            
        Returns:
            Device or None
        """
        cursor = await self.db.execute(
            "SELECT * FROM devices WHERE id = ?", (device_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return self._row_to_entity(row)
    
    async def get_all(self) -> list[Device]:
        """Get all devices.
        
        Returns:
            List of devices
        """
        cursor = await self.db.execute("SELECT * FROM devices")
        rows = await cursor.fetchall()
        return [self._row_to_entity(row) for row in rows]
    
    async def update(self, device: Device) -> Device:
        """Update device.
        
        Args:
            device: Device to update
            
        Returns:
            Updated device
        """
        await self.db.execute(
            """UPDATE devices SET name=?, location=?, is_active=?
               WHERE id=?""",
            (device.name, device.location, device.is_active, device.id)
        )
        return device
    
    async def delete(self, device_id: int) -> None:
        """Soft delete device.
        
        Args:
            device_id: Device ID
        """
        await self.db.execute(
            "UPDATE devices SET is_active = 0 WHERE id = ?", (device_id,)
        )
    
    async def find_by_type(self, device_type: str) -> list[Device]:
        """Find by type.
        
        Args:
            device_type: Device type
            
        Returns:
            Matching devices
        """
        cursor = await self.db.execute(
            "SELECT * FROM devices WHERE type = ?", (device_type,)
        )
        rows = await cursor.fetchall()
        return [self._row_to_entity(row) for row in rows]
    
    async def find_by_location(self, location: str) -> list[Device]:
        """Find by location.
        
        Args:
            location: Location
            
        Returns:
            Matching devices
        """
        cursor = await self.db.execute(
            "SELECT * FROM devices WHERE location = ?", (location,)
        )
        rows = await cursor.fetchall()
        return [self._row_to_entity(row) for row in rows]
    
    def _row_to_entity(self, row) -> Device:
        """Convert database row to entity.
        
        Args:
            row: Database row
            
        Returns:
            Device entity
        """
        return DeviceFactory.create(
            device_id=row['id'],
            name=row['name'],
            device_type=row['type'],
            wattage=row['wattage'],
            location=row['location'],
            is_active=bool(row['is_active']),
            created_at=datetime.fromisoformat(row['created_at']),
        )
