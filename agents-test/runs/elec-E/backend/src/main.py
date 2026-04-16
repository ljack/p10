"""FastAPI application entry point."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from infrastructure.database.connection import DatabaseConnection
from infrastructure.database.schema import initialize_database
from infrastructure.persistence.unit_of_work import UnitOfWork
from infrastructure.events.event_bus import InMemoryEventBus
from application.mediator import Mediator, Handler
from application.commands.device_commands import CreateDeviceCommand, UpdateDeviceCommand, DeleteDeviceCommand
from application.queries.device_queries import GetDeviceQuery, ListDevicesQuery
from application.handlers.create_device_handler import CreateDeviceHandler
from application.handlers.get_device_handler import GetDeviceHandler
from presentation.api.v1 import devices
from presentation.middleware.error_handler import error_handler_middleware
from presentation.middleware.rate_limiter import RateLimiter

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler.
    
    Args:
        app: FastAPI application
        
    Yields:
        None
    """
    db = DatabaseConnection("electricity.db")
    conn = await db.connect()
    await initialize_database(conn)
    
    event_bus = InMemoryEventBus()
    uow = UnitOfWork(db)
    
    mediator = Mediator()
    mediator.register(
        CreateDeviceCommand,
        Handler(handle=CreateDeviceHandler(uow, event_bus).handle)
    )
    mediator.register(
        GetDeviceQuery,
        Handler(handle=GetDeviceHandler(uow).handle)
    )
    
    app.state.mediator = mediator
    app.state.db = db
    
    yield
    
    await db.close()


app = FastAPI(
    title="Home Electricity Consumption API",
    version="1.0.0",
    description="Track and manage home electricity consumption",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(error_handler_middleware)
rate_limiter = RateLimiter()

app.include_router(devices.router)


@app.get("/api/health")
async def health_check() -> dict:
    """Health check endpoint.
    
    Returns:
        Health status
    """
    return {"status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
