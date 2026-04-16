"""Main FastAPI application."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import pets, treatments, appointments
from app.seed import seed_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    seed_all()
    yield


app = FastAPI(title="Vet Clinic API", version="1.0.0", lifespan=lifespan)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pets.router)
app.include_router(treatments.router)
app.include_router(appointments.router)


@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Vet Clinic API", "version": "1.0.0"}
