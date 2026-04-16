from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date

from fastapi import Depends, FastAPI, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_session
from .models import AppointmentStatus
from .schemas import (
    AppointmentCreate,
    AppointmentRead,
    AppointmentUpdate,
    AvailableSlotsRead,
    PetCreate,
    PetRead,
    PetUpdate,
    TreatmentCreate,
    TreatmentRead,
    TreatmentUpdate,
)
from .services import (
    available_slots,
    cancel_appointment,
    create_appointment,
    create_pet,
    create_treatment,
    delete_pet,
    delete_treatment,
    get_appointment_or_404,
    get_pet_or_404,
    init_db,
    list_appointments,
    list_pets,
    list_treatments,
    update_appointment,
    update_pet,
    update_treatment,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Vet Appointment API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Vet Appointment API is running."}


@app.get("/api/pets", response_model=list[PetRead])
async def read_pets(
    owner_name: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    return await list_pets(session, owner_name=owner_name)


@app.post("/api/pets", response_model=PetRead, status_code=status.HTTP_201_CREATED)
async def create_pet_endpoint(
    payload: PetCreate,
    session: AsyncSession = Depends(get_session),
):
    return await create_pet(session, payload)


@app.get("/api/pets/{pet_id}", response_model=PetRead)
async def read_pet(pet_id: int, session: AsyncSession = Depends(get_session)):
    return await get_pet_or_404(session, pet_id)


@app.put("/api/pets/{pet_id}", response_model=PetRead)
async def update_pet_endpoint(
    pet_id: int,
    payload: PetUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await update_pet(session, pet_id, payload)


@app.delete("/api/pets/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pet_endpoint(pet_id: int, session: AsyncSession = Depends(get_session)):
    await delete_pet(session, pet_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/treatments", response_model=list[TreatmentRead])
async def read_treatments(session: AsyncSession = Depends(get_session)):
    return await list_treatments(session)


@app.post("/api/treatments", response_model=TreatmentRead, status_code=status.HTTP_201_CREATED)
async def create_treatment_endpoint(
    payload: TreatmentCreate,
    session: AsyncSession = Depends(get_session),
):
    return await create_treatment(session, payload)


@app.put("/api/treatments/{treatment_id}", response_model=TreatmentRead)
async def update_treatment_endpoint(
    treatment_id: int,
    payload: TreatmentUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await update_treatment(session, treatment_id, payload)


@app.delete("/api/treatments/{treatment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_treatment_endpoint(
    treatment_id: int,
    session: AsyncSession = Depends(get_session),
):
    await delete_treatment(session, treatment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/appointments", response_model=list[AppointmentRead])
async def read_appointments(
    date: date | None = Query(default=None),
    pet_id: int | None = Query(default=None, ge=1),
    status_filter: AppointmentStatus | None = Query(default=None, alias="status"),
    session: AsyncSession = Depends(get_session),
):
    return await list_appointments(
        session,
        target_date=date,
        pet_id=pet_id,
        status_filter=status_filter,
    )


@app.get("/api/appointments/available-slots", response_model=AvailableSlotsRead)
async def read_available_slots(
    date: date,
    treatment_id: int = Query(..., ge=1),
    session: AsyncSession = Depends(get_session),
):
    return await available_slots(session, target_date=date, treatment_id=treatment_id)


@app.post(
    "/api/appointments",
    response_model=AppointmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_appointment_endpoint(
    payload: AppointmentCreate,
    session: AsyncSession = Depends(get_session),
):
    return await create_appointment(session, payload)


@app.get("/api/appointments/{appointment_id}", response_model=AppointmentRead)
async def read_appointment(
    appointment_id: int,
    session: AsyncSession = Depends(get_session),
):
    return await get_appointment_or_404(session, appointment_id)


@app.put("/api/appointments/{appointment_id}", response_model=AppointmentRead)
async def update_appointment_endpoint(
    appointment_id: int,
    payload: AppointmentUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await update_appointment(session, appointment_id, payload)


@app.delete("/api/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment_endpoint(
    appointment_id: int,
    session: AsyncSession = Depends(get_session),
):
    await cancel_appointment(session, appointment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
