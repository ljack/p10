"""Main FastAPI application."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .infrastructure.database import create_tables, TreatmentModel
from .domain.exceptions import DomainError
from .application.exceptions import ApplicationError
from .infrastructure.exceptions import InfrastructureError
from .presentation.errors import (
    domain_error_handler,
    application_error_handler,
    infrastructure_error_handler,
)


DATABASE_URL = "sqlite+aiosqlite:///./vet.db"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler.
    
    Args:
        app: FastAPI application
    Returns: Async generator
    Raises: None
    """
    from sqlalchemy.ext.asyncio import create_async_engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    await create_tables(engine)
    await _seed_data(engine)
    yield
    await engine.dispose()


async def _seed_data(engine) -> None:
    """Seed initial data.
    
    Args:
        engine: Database engine
    Returns: None
    Raises: None
    """
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession
    async with AsyncSession(engine) as session:
        result = await session.execute(select(TreatmentModel))
        if result.first() is None:
            treatments = [
                TreatmentModel(name="Vaccination", duration_minutes=15, price=50.0),
                TreatmentModel(name="Dental Cleaning", duration_minutes=45, price=150.0),
                TreatmentModel(name="X-Ray", duration_minutes=30, price=100.0),
                TreatmentModel(name="General Checkup", duration_minutes=20, price=60.0),
                TreatmentModel(name="Surgery", duration_minutes=120, price=500.0),
            ]
            for t in treatments:
                session.add(t)
            await session.commit()


app = FastAPI(
    title="Vet Appointment API",
    version="1.0.0",
    lifespan=lifespan,
)


limiter = Limiter(key_func=get_remote_address, default_limits=["10/second"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_exception_handler(DomainError, domain_error_handler)
app.add_exception_handler(ApplicationError, application_error_handler)
app.add_exception_handler(InfrastructureError, infrastructure_error_handler)


@app.get("/")
async def root():
    """Root endpoint.
    
    Args: None
    Returns: Welcome message
    Raises: None
    """
    return {"message": "Vet Appointment API", "version": "1.0.0"}
