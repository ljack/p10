"""Application layer exceptions."""
from typing import Any
from ..domain.exceptions import DomainError


class ApplicationError(DomainError):
    """Base application error."""
    pass


class CommandValidationError(ApplicationError):
    """Command validation error."""
    
    def __init__(self, command: str, errors: dict[str, Any]) -> None:
        """Initialize command validation error.
        
        Args:
            command: Command name
            errors: Validation errors
        Returns: None
        Raises: None
        """
        super().__init__(
            code="2001",
            message=f"Invalid {command} command",
            details=errors,
            suggestion="Check command parameters",
        )


class QueryValidationError(ApplicationError):
    """Query validation error."""
    
    def __init__(self, query: str, errors: dict[str, Any]) -> None:
        """Initialize query validation error.
        
        Args:
            query: Query name
            errors: Validation errors
        Returns: None
        Raises: None
        """
        super().__init__(
            code="2002",
            message=f"Invalid {query} query",
            details=errors,
            suggestion="Check query parameters",
        )


class HandlerNotFoundError(ApplicationError):
    """Handler not found error."""
    
    def __init__(self, message_type: str) -> None:
        """Initialize handler not found error.
        
        Args:
            message_type: Message type
        Returns: None
        Raises: None
        """
        super().__init__(
            code="2003",
            message=f"No handler found for {message_type}",
            details={"message_type": message_type},
            suggestion="Register handler in mediator",
        )
