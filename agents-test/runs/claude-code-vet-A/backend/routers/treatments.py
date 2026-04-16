from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Treatment, Appointment
from schemas import TreatmentCreate, TreatmentUpdate, TreatmentResponse

router = APIRouter(prefix="/api/treatments", tags=["treatments"])


@router.get("", response_model=list[TreatmentResponse])
async def list_treatments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Treatment).order_by(Treatment.name))
    return result.scalars().all()


@router.post("", response_model=TreatmentResponse, status_code=201)
async def create_treatment(data: TreatmentCreate, db: AsyncSession = Depends(get_db)):
    treatment = Treatment(**data.model_dump())
    db.add(treatment)
    await db.commit()
    await db.refresh(treatment)
    return treatment


@router.put("/{treatment_id}", response_model=TreatmentResponse)
async def update_treatment(
    treatment_id: int, data: TreatmentUpdate, db: AsyncSession = Depends(get_db)
):
    treatment = await db.get(Treatment, treatment_id)
    if not treatment:
        raise HTTPException(404, "Treatment not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(treatment, key, val)
    await db.commit()
    await db.refresh(treatment)
    return treatment


@router.delete("/{treatment_id}", status_code=204)
async def delete_treatment(treatment_id: int, db: AsyncSession = Depends(get_db)):
    treatment = await db.get(Treatment, treatment_id)
    if not treatment:
        raise HTTPException(404, "Treatment not found")
    result = await db.execute(
        select(Appointment).where(
            Appointment.treatment_id == treatment_id,
            Appointment.status != "cancelled",
        )
    )
    if result.scalars().first():
        raise HTTPException(400, "Cannot delete treatment with active appointments")
    await db.delete(treatment)
    await db.commit()
