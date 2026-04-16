"""Domain exception hierarchy."""
from datetime import datetime
from typing import Any


class DomainError(Exception):
    """Base domain error."""
    
    def __init__(
        self,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
        suggestion: str | None = None,
    ) -> None:
        """Initialize domain error.
        
        Args:
            code: 4-digit error code
            message: Error message
            details: Additional details
            suggestion: Suggestion for resolution
        Returns: None
        Raises: None
        """
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.suggestion = suggestion
        self.timestamp = datetime.utcnow()
        self.trace_id = id(self)


class ValidationError(DomainError):
    """Domain validation error."""
    
    def __init__(self, field: str, message: str, suggestion: str | None = None) -> None:
        """Initialize validation error.
        
        Args:
            field: Field that failed validation
            message: Error message
            suggestion: Suggestion for resolution
        Returns: None
        Raises: None
        """
        super().__init__(
            code="1001",
            message=message,
            details={"field": field},
            suggestion=suggestion or f"Please provide valid {field}",
        )


class EntityNotFoundError(DomainError):
    """Entity not found error."""
    
    def __init__(self, entity_type: str, id: int) -> None:
        """Initialize entity not found error.
        
        Args:
            entity_type: Type of entity
            id: Entity ID
        Returns: None
        Raises: None
        """
        super().__init__(
            code="1002",
            message=f"{entity_type} with id {id} not found",
            details={"entity_type": entity_type, "id": id},
            suggestion=f"Check if {entity_type} exists",
        )


class BusinessRuleViolation(DomainError):
    """Business rule violation error."""
    
    def __init__(self, rule: str, message: str) -> None:
        """Initialize business rule violation.
        
        Args:
            rule: Business rule name
            message: Error message
        Returns: None
        Raises: None
        """
        super().__init__(
            code="1003",
            message=message,
            details={"rule": rule},
            suggestion="Review business constraints",
        )


class ConflictError(DomainError):
    """Resource conflict error."""
    
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        """Initialize conflict error.
        
        Args:
            message: Error message
            details: Additional details
        Returns: None
        Raises: None
        """
        super().__init__(
            code="1004",
            message=message,
            details=details,
            suggestion="Choose a different time slot",
        )
