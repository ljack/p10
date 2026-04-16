"""Schedule factory."""
from datetime import time
from domain.entities.schedule import Schedule


class ScheduleFactory:
    """Factory for creating Schedule entities."""
    
    @staticmethod
    def create(
        device_id: int,
        day_of_week: int,
        start_time: time,
        end_time: time,
        schedule_id: int | None = None,
        enabled: bool = True,
    ) -> Schedule:
        """Create a new schedule.
        
        Args:
            device_id: Device identifier
            day_of_week: Day (0-6, Mon-Sun)
            start_time: Schedule start time
            end_time: Schedule end time
            schedule_id: Optional ID for existing schedule
            enabled: Whether schedule is enabled
            
        Returns:
            New Schedule instance
        """
        return Schedule(
            id=schedule_id,
            device_id=device_id,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time,
            enabled=enabled,
        )
