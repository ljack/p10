"""Infrastructure layer exceptions."""
from ..domain.exceptions import DomainError


class InfrastructureError(DomainError):
    """Base infrastructure error."""
    pass


class DatabaseError(InfrastructureError):
    """Database operation error."""
    
    def __init__(self, operation: str, details: str) -> None:
        """Initialize database error.
        
        Args:
            operation: Database operation
            details: Error details
        Returns: None
        Raises: None
        """
        super().__init__(
            code="3001",
            message=f"Database {operation} failed",
            details={"operation": operation, "details": details},
            suggestion="Check database connection and retry",
        )


class ConnectionError(InfrastructureError):
    """Database connection error."""
    
    def __init__(self, details: str) -> None:
        """Initialize connection error.
        
        Args:
            details: Error details
        Returns: None
        Raises: None
        """
        super().__init__(
            code="3002",
            message="Database connection failed",
            details={"details": details},
            suggestion="Check database configuration",
        )
