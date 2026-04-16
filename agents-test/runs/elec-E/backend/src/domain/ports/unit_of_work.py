"""Unit of work port."""
from typing import Protocol
from domain.ports.device_repository import DeviceRepositoryPort
from domain.ports.consumption_repository import ConsumptionRepositoryPort
from domain.ports.schedule_repository import ScheduleRepositoryPort
from domain.ports.budget_repository import BudgetRepositoryPort


class UnitOfWorkPort(Protocol):
    """Port for unit of work pattern."""
    
    devices: DeviceRepositoryPort
    consumption: ConsumptionRepositoryPort
    schedules: ScheduleRepositoryPort
    budgets: BudgetRepositoryPort
    
    async def __aenter__(self) -> "UnitOfWorkPort":
        """Enter context manager.
        
        Returns:
            Self
        """
        ...
    
    async def __aexit__(self, *args) -> None:
        """Exit context manager and rollback if needed.
        
        Args:
            *args: Exception info if any
        """
        ...
    
    async def commit(self) -> None:
        """Commit the transaction."""
        ...
    
    async def rollback(self) -> None:
        """Rollback the transaction."""
        ...
