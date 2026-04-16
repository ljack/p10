"""Unit of Work implementation."""
from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyUnitOfWork:
    """SQLAlchemy implementation of Unit of Work."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize unit of work.
        
        Args:
            session: Database session
        Returns: None
        Raises: None
        """
        self.session = session

    async def __aenter__(self) -> "SqlAlchemyUnitOfWork":
        """Enter context.
        
        Args: None
        Returns: Self
        Raises: None
        """
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Exit context.
        
        Args:
            exc_type: Exception type
            exc_val: Exception value
            exc_tb: Exception traceback
        Returns: None
        Raises: None
        """
        if exc_type is not None:
            await self.rollback()
        else:
            await self.commit()

    async def commit(self) -> None:
        """Commit transaction.
        
        Args: None
        Returns: None
        Raises: DatabaseError
        """
        await self.session.commit()

    async def rollback(self) -> None:
        """Rollback transaction.
        
        Args: None
        Returns: None
        Raises: DatabaseError
        """
        await self.session.rollback()
