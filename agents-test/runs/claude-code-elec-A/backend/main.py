from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables, database
from seed import seed_data

from routers import devices, consumption, schedules, budget


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_tables()
    await database.connect()
    await seed_data()
    yield
    # Shutdown
    await database.disconnect()


app = FastAPI(
    title="Home Electricity Consumption Tracker",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router)
app.include_router(consumption.router)
app.include_router(schedules.router)
app.include_router(budget.router)


@app.get("/")
async def root():
    return {"message": "Home Electricity Consumption Tracker API", "docs": "/docs"}
