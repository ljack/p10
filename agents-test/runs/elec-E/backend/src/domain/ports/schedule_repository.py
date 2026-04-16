"""Schedule repository port."""
from typing import Protocol
from domain.entities.schedule import Schedule


class ScheduleRepositoryPort(Protocol):
    """Port for schedule repository operations."""
    
    async def add(self, schedule: Schedule) -> Schedule:
        """Add schedule.
        
        Args:
            schedule: Schedule to add
            
        Returns:
            Schedule with assigned ID
        """
        ...
    
    async def get_by_id(self, schedule_id: int) -> Schedule | None:
        """Get schedule by ID.
        
        Args:
            schedule_id: Schedule identifier
            
        Returns:
            Schedule if found, None otherwise
        """
        ...
    
    async def get_all(self) -> list[Schedule]:
        """Get all schedules.
        
        Returns:
            List of all schedules
        """
        ...
    
    async def update(self, schedule: Schedule) -> Schedule:
        """Update schedule.
        
        Args:
            schedule: Schedule to update
            
        Returns:
            Updated schedule
        """
        ...
    
    async def delete(self, schedule_id: int) -> None:
        """Delete schedule.
        
        Args:
            schedule_id: Schedule identifier
        """
        ...
    
    async def find_by_device(self, device_id: int) -> list[Schedule]:
        """Find schedules for device.
        
        Args:
            device_id: Device identifier
            
        Returns:
            List of schedules for device
        """
        ...
    
    async def find_by_day(self, day_of_week: int) -> list[Schedule]:
        """Find schedules for day of week.
        
        Args:
            day_of_week: Day (0-6, Mon-Sun)
            
        Returns:
            List of schedules for day
        """
        ...
