"""Handler for creating devices."""
from application.commands.device_commands import CreateDeviceCommand
from application.dto.device_dto import DeviceDTO
from domain.ports.unit_of_work import UnitOfWorkPort
from domain.ports.event_bus import EventBusPort
from domain.factories.device_factory import DeviceFactory
from domain.events.device_events import DeviceCreated


class CreateDeviceHandler:
    """Handler for CreateDeviceCommand."""
    
    def __init__(self, uow: UnitOfWorkPort, event_bus: EventBusPort) -> None:
        """Initialize handler.
        
        Args:
            uow: Unit of work
            event_bus: Event bus
        """
        self.uow = uow
        self.event_bus = event_bus
    
    async def handle(self, command: CreateDeviceCommand) -> DeviceDTO:
        """Handle device creation.
        
        Args:
            command: Create device command
            
        Returns:
            Created device DTO
        """
        device = DeviceFactory.create(
            name=command.name,
            device_type=command.type,
            wattage=command.wattage,
            location=command.location,
        )
        
        async with self.uow:
            saved = await self.uow.devices.add(device)
            await self.uow.commit()
        
        event = DeviceCreated(
            aggregate_id=saved.id,
            payload={"name": saved.name, "type": saved.type.value}
        )
        await self.event_bus.publish(event)
        
        return DeviceDTO(
            id=saved.id,
            name=saved.name,
            type=saved.type.value,
            wattage=saved.wattage.value,
            location=saved.location,
            is_active=saved.is_active,
            created_at=saved.created_at,
        )
