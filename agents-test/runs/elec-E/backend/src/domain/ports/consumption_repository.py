"""Consumption repository port."""
from typing import Protocol
from datetime import datetime
from domain.entities.consumption_log import ConsumptionLog


class ConsumptionRepositoryPort(Protocol):
    """Port for consumption repository operations."""
    
    async def add(self, log: ConsumptionLog) -> ConsumptionLog:
        """Add consumption log.
        
        Args:
            log: Consumption log to add
            
        Returns:
            Log with assigned ID
        """
        ...
    
    async def get_by_id(self, log_id: int) -> ConsumptionLog | None:
        """Get log by ID.
        
        Args:
            log_id: Log identifier
            
        Returns:
            Log if found, None otherwise
        """
        ...
    
    async def get_all(self) -> list[ConsumptionLog]:
        """Get all logs.
        
        Returns:
            List of all logs
        """
        ...
    
    async def find_by_device(self, device_id: int) -> list[ConsumptionLog]:
        """Find logs for device.
        
        Args:
            device_id: Device identifier
            
        Returns:
            List of logs for device
        """
        ...
    
    async def find_by_date_range(
        self, start: datetime, end: datetime
    ) -> list[ConsumptionLog]:
        """Find logs within date range.
        
        Args:
            start: Start datetime
            end: End datetime
            
        Returns:
            List of logs in range
        """
        ...
