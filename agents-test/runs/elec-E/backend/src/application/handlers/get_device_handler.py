"""Handler for getting device by ID."""
from application.queries.device_queries import GetDeviceQuery
from application.dto.device_dto import DeviceDTO
from domain.ports.unit_of_work import UnitOfWorkPort
from domain.exceptions import DeviceNotFoundError


class GetDeviceHandler:
    """Handler for GetDeviceQuery."""
    
    def __init__(self, uow: UnitOfWorkPort) -> None:
        """Initialize handler.
        
        Args:
            uow: Unit of work
        """
        self.uow = uow
    
    async def handle(self, query: GetDeviceQuery) -> DeviceDTO:
        """Handle get device query.
        
        Args:
            query: Get device query
            
        Returns:
            Device DTO
            
        Raises:
            DeviceNotFoundError: If device not found
        """
        async with self.uow:
            device = await self.uow.devices.get_by_id(query.device_id)
        
        if not device:
            raise DeviceNotFoundError(query.device_id)
        
        return DeviceDTO(
            id=device.id,
            name=device.name,
            type=device.type.value,
            wattage=device.wattage.value,
            location=device.location,
            is_active=device.is_active,
            created_at=device.created_at,
        )
