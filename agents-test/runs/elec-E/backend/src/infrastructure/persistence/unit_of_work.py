"""Unit of work implementation."""
from infrastructure.database.connection import DatabaseConnection
from infrastructure.persistence.device_repository import DeviceRepository
from infrastructure.persistence.consumption_repository import ConsumptionRepository


class UnitOfWork:
    """Unit of work for transaction management."""
    
    def __init__(self, db: DatabaseConnection) -> None:
        """Initialize unit of work.
        
        Args:
            db: Database connection
        """
        self.db = db
        self.devices = DeviceRepository(db)
        self.consumption = ConsumptionRepository(db)
    
    async def __aenter__(self) -> "UnitOfWork":
        """Enter context.
        
        Returns:
            Self
        """
        await self.db.connect()
        return self
    
    async def __aexit__(self, *args) -> None:
        """Exit context.
        
        Args:
            *args: Exception info
        """
        if args[0]:
            await self.rollback()
    
    async def commit(self) -> None:
        """Commit transaction."""
        await self.db.commit()
    
    async def rollback(self) -> None:
        """Rollback transaction."""
        await self.db.rollback()
