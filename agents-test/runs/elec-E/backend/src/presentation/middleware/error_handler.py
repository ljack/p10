"""Error handling middleware."""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
from uuid import uuid4
from domain.exceptions import DomainError
import logging

logger = logging.getLogger(__name__)


async def error_handler_middleware(request: Request, call_next):
    """Handle errors and format responses.
    
    Args:
        request: FastAPI request
        call_next: Next middleware
        
    Returns:
        Response with formatted error if exception occurred
    """
    try:
        return await call_next(request)
    except DomainError as e:
        trace_id = str(uuid4())
        logger.error(f"Domain error: {e}", extra={"trace_id": trace_id})
        return JSONResponse(
            status_code=400,
            content={
                "code": e.code,
                "message": e.message,
                "details": e.details,
                "timestamp": datetime.utcnow().isoformat(),
                "trace_id": trace_id,
                "suggestion": "Check request parameters"
            }
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        trace_id = str(uuid4())
        logger.exception("Unexpected error", extra={"trace_id": trace_id})
        return JSONResponse(
            status_code=500,
            content={
                "code": 5000,
                "message": "Internal server error",
                "details": {},
                "timestamp": datetime.utcnow().isoformat(),
                "trace_id": trace_id,
                "suggestion": "Contact support with trace_id"
            }
        )
