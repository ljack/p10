"""Consumption log factory."""
from datetime import datetime
from domain.entities.consumption_log import ConsumptionLog
from domain.value_objects.duration import Duration


class ConsumptionFactory:
    """Factory for creating ConsumptionLog entities."""
    
    @staticmethod
    def create(
        device_id: int,
        started_at: datetime,
        duration_minutes: int,
        wattage: int,
        log_id: int | None = None,
        recorded_at: datetime | None = None,
    ) -> ConsumptionLog:
        """Create a new consumption log.
        
        Args:
            device_id: Device identifier
            started_at: When consumption started
            duration_minutes: Duration in minutes
            wattage: Device wattage
            log_id: Optional ID for existing log
            recorded_at: When log was recorded
            
        Returns:
            New ConsumptionLog instance
            
        Raises:
            InvalidDurationError: If duration is invalid
        """
        duration = Duration(duration_minutes)
        kwh = ConsumptionLog.calculate_kwh(wattage, duration_minutes)
        
        return ConsumptionLog(
            id=log_id,
            device_id=device_id,
            started_at=started_at,
            duration=duration,
            kwh=kwh,
            recorded_at=recorded_at or datetime.utcnow(),
        )
