"""Database connection management."""
import aiosqlite
from pathlib import Path


class DatabaseConnection:
    """Manages SQLite database connection."""
    
    def __init__(self, db_path: str = "electricity.db") -> None:
        """Initialize database connection.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self._connection: aiosqlite.Connection | None = None
    
    async def connect(self) -> aiosqlite.Connection:
        """Get or create database connection.
        
        Returns:
            Database connection
        """
        if not self._connection:
            self._connection = await aiosqlite.connect(self.db_path)
            self._connection.row_factory = aiosqlite.Row
        return self._connection
    
    async def close(self) -> None:
        """Close database connection."""
        if self._connection:
            await self._connection.close()
            self._connection = None
    
    async def execute(self, sql: str, params: tuple = ()) -> aiosqlite.Cursor:
        """Execute SQL statement.
        
        Args:
            sql: SQL statement
            params: Query parameters
            
        Returns:
            Database cursor
        """
        conn = await self.connect()
        return await conn.execute(sql, params)
    
    async def commit(self) -> None:
        """Commit current transaction."""
        conn = await self.connect()
        await conn.commit()
    
    async def rollback(self) -> None:
        """Rollback current transaction."""
        conn = await self.connect()
        await conn.rollback()
