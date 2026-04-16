from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from database import engine, Base, async_session
from models import Treatment
from routers.pets import router as pets_router
from routers.treatments import router as treatments_router
from routers.appointments import router as appointments_router

SEED_TREATMENTS = [
    {"name": "Vaccination", "duration_minutes": 30, "description": "Standard vaccination for pets", "price": 35.00},
    {"name": "Dental Cleaning", "duration_minutes": 60, "description": "Professional dental cleaning", "price": 150.00},
    {"name": "X-ray", "duration_minutes": 45, "description": "Diagnostic X-ray imaging", "price": 120.00},
    {"name": "General Checkup", "duration_minutes": 30, "description": "Routine health examination", "price": 50.00},
    {"name": "Surgery Consultation", "duration_minutes": 30, "description": "Pre-surgery consultation and assessment", "price": 75.00},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as session:
        result = await session.execute(select(Treatment))
        if not result.scalars().first():
            for data in SEED_TREATMENTS:
                session.add(Treatment(**data))
            await session.commit()
    yield


app = FastAPI(title="Vet Clinic API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pets_router)
app.include_router(treatments_router)
app.include_router(appointments_router)
