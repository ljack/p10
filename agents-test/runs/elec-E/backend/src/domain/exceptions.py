"""Domain-level exceptions with unique error codes."""
from typing import Any


class DomainError(Exception):
    """Base exception for domain errors."""
    
    def __init__(self, code: int, message: str, details: dict[str, Any] | None = None) -> None:
        """Initialize domain error.
        
        Args:
            code: Unique 4-digit error code
            message: Human-readable error message
            details: Additional error context
        """
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


class DeviceNotFoundError(DomainError):
    """Device not found in system."""
    
    def __init__(self, device_id: int) -> None:
        """Initialize device not found error.
        
        Args:
            device_id: ID of missing device
        """
        super().__init__(1001, f"Device {device_id} not found", {"device_id": device_id})


class InvalidDeviceTypeError(DomainError):
    """Invalid device type specified."""
    
    def __init__(self, device_type: str) -> None:
        """Initialize invalid device type error.
        
        Args:
            device_type: Invalid type value
        """
        super().__init__(1002, f"Invalid device type: {device_type}", {"type": device_type})


class InvalidWattageError(DomainError):
    """Invalid wattage value."""
    
    def __init__(self, wattage: int) -> None:
        """Initialize invalid wattage error.
        
        Args:
            wattage: Invalid wattage value
        """
        super().__init__(1003, f"Wattage must be positive: {wattage}", {"wattage": wattage})


class InvalidDurationError(DomainError):
    """Invalid duration value."""
    
    def __init__(self, duration: int) -> None:
        """Initialize invalid duration error.
        
        Args:
            duration: Invalid duration in minutes
        """
        super().__init__(1004, f"Duration must be positive: {duration}", {"duration": duration})


class ScheduleConflictError(DomainError):
    """Schedule time conflict."""
    
    def __init__(self, details: dict[str, Any]) -> None:
        """Initialize schedule conflict error.
        
        Args:
            details: Conflict details
        """
        super().__init__(1005, "Schedule time conflict", details)


class BudgetNotFoundError(DomainError):
    """Budget not found for specified month."""
    
    def __init__(self, year_month: str) -> None:
        """Initialize budget not found error.
        
        Args:
            year_month: Month identifier (YYYY-MM)
        """
        super().__init__(1006, f"Budget not found for {year_month}", {"year_month": year_month})


class InvalidBudgetError(DomainError):
    """Invalid budget parameters."""
    
    def __init__(self, message: str, details: dict[str, Any]) -> None:
        """Initialize invalid budget error.
        
        Args:
            message: Error description
            details: Error context
        """
        super().__init__(1007, message, details)
