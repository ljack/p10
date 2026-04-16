"""Consumption repository implementation."""
from datetime import datetime
from domain.entities.consumption_log import ConsumptionLog
from domain.factories.consumption_factory import ConsumptionFactory
from domain.value_objects.duration import Duration
from infrastructure.database.connection import DatabaseConnection


class ConsumptionRepository:
    """SQLite implementation of consumption repository."""
    
    def __init__(self, db: DatabaseConnection) -> None:
        """Initialize repository.
        
        Args:
            db: Database connection
        """
        self.db = db
    
    async def add(self, log: ConsumptionLog) -> ConsumptionLog:
        """Add log.
        
        Args:
            log: Log to add
            
        Returns:
            Log with ID
        """
        cursor = await self.db.execute(
            """INSERT INTO consumption_logs (device_id, started_at, duration_minutes, kwh, recorded_at)
               VALUES (?, ?, ?, ?, ?)""",
            (log.device_id, log.started_at, log.duration.minutes, log.kwh, log.recorded_at)
        )
        log.id = cursor.lastrowid
        return log
    
    async def get_by_id(self, log_id: int) -> ConsumptionLog | None:
        """Get by ID.
        
        Args:
            log_id: Log ID
            
        Returns:
            Log or None
        """
        cursor = await self.db.execute("SELECT * FROM consumption_logs WHERE id = ?", (log_id,))
        row = await cursor.fetchone()
        return self._row_to_entity(row) if row else None
    
    async def get_all(self) -> list[ConsumptionLog]:
        """Get all logs.
        
        Returns:
            All logs
        """
        cursor = await self.db.execute("SELECT * FROM consumption_logs")
        rows = await cursor.fetchall()
        return [self._row_to_entity(row) for row in rows]
    
    async def find_by_device(self, device_id: int) -> list[ConsumptionLog]:
        """Find by device.
        
        Args:
            device_id: Device ID
            
        Returns:
            Device logs
        """
        cursor = await self.db.execute(
            "SELECT * FROM consumption_logs WHERE device_id = ?", (device_id,)
        )
        rows = await cursor.fetchall()
        return [self._row_to_entity(row) for row in rows]
    
    async def find_by_date_range(
        self, start: datetime, end: datetime
    ) -> list[ConsumptionLog]:
        """Find by date range.
        
        Args:
            start: Start date
            end: End date
            
        Returns:
            Logs in range
        """
        cursor = await self.db.execute(
            "SELECT * FROM consumption_logs WHERE started_at BETWEEN ? AND ?",
            (start, end)
        )
        rows = await cursor.fetchall()
        return [self._row_to_entity(row) for row in rows]
    
    def _row_to_entity(self, row) -> ConsumptionLog:
        """Convert row to entity.
        
        Args:
            row: DB row
            
        Returns:
            Entity
        """
        return ConsumptionLog(
            id=row['id'],
            device_id=row['device_id'],
            started_at=datetime.fromisoformat(row['started_at']),
            duration=Duration(row['duration_minutes']),
            kwh=row['kwh'],
            recorded_at=datetime.fromisoformat(row['recorded_at']),
        )
