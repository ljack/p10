"""Error handlers."""
from fastapi import Request, status
from fastapi.responses import JSONResponse

from ..domain.exceptions import (
    DomainError,
    ValidationError,
    EntityNotFoundError,
    BusinessRuleViolation,
    ConflictError,
)
from ..application.exceptions import ApplicationError
from ..infrastructure.exceptions import InfrastructureError
from .dtos import ErrorResponse


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    """Handle domain errors.
    
    Args:
        request: HTTP request
        exc: Domain exception
    Returns: JSON error response
    Raises: None
    """
    error = ErrorResponse(
        code=exc.code,
        message=exc.message,
        details=exc.details,
        timestamp=exc.timestamp,
        trace_id=exc.trace_id,
        suggestion=exc.suggestion or "Review request and try again",
    )
    return JSONResponse(
        status_code=_get_status_code(exc), content=error.model_dump()
    )


async def application_error_handler(
    request: Request, exc: ApplicationError
) -> JSONResponse:
    """Handle application errors.
    
    Args:
        request: HTTP request
        exc: Application exception
    Returns: JSON error response
    Raises: None
    """
    error = ErrorResponse(
        code=exc.code,
        message=exc.message,
        details=exc.details,
        timestamp=exc.timestamp,
        trace_id=exc.trace_id,
        suggestion=exc.suggestion or "Check application state",
    )
    return JSONResponse(status_code=400, content=error.model_dump())


async def infrastructure_error_handler(
    request: Request, exc: InfrastructureError
) -> JSONResponse:
    """Handle infrastructure errors.
    
    Args:
        request: HTTP request
        exc: Infrastructure exception
    Returns: JSON error response
    Raises: None
    """
    error = ErrorResponse(
        code=exc.code,
        message=exc.message,
        details=exc.details,
        timestamp=exc.timestamp,
        trace_id=exc.trace_id,
        suggestion=exc.suggestion or "Retry operation",
    )
    return JSONResponse(status_code=503, content=error.model_dump())


def _get_status_code(exc: DomainError) -> int:
    """Get HTTP status code for exception.
    
    Args:
        exc: Domain exception
    Returns: HTTP status code
    Raises: None
    """
    if isinstance(exc, EntityNotFoundError):
        return status.HTTP_404_NOT_FOUND
    if isinstance(exc, ValidationError):
        return status.HTTP_422_UNPROCESSABLE_ENTITY
    if isinstance(exc, ConflictError):
        return status.HTTP_409_CONFLICT
    if isinstance(exc, BusinessRuleViolation):
        return status.HTTP_400_BAD_REQUEST
    return status.HTTP_500_INTERNAL_SERVER_ERROR
