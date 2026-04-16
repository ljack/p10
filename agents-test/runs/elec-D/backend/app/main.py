"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, close_db
from app.routers import devices

app = FastAPI(
    title="Home Electricity Consumption API",
    description="Track and manage home electricity consumption",
    version="1.0.0"
)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(devices.router)


@app.on_event("startup")
async def startup():
    """Initialize database on startup."""
    await init_db()


@app.on_event("shutdown")
async def shutdown():
    """Close database on shutdown."""
    await close_db()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Home Electricity Consumption API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
