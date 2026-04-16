from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db, seed_db
from routers import devices, consumption, schedules, budget


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_db()
    yield


app = FastAPI(title="Home Electricity Consumption API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router)
app.include_router(consumption.router)
app.include_router(schedules.router)
app.include_router(budget.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
