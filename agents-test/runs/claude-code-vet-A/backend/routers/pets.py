from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Pet, Appointment
from schemas import PetCreate, PetUpdate, PetResponse

router = APIRouter(prefix="/api/pets", tags=["pets"])


@router.get("", response_model=list[PetResponse])
async def list_pets(owner_name: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Pet)
    if owner_name:
        query = query.where(Pet.owner_name.ilike(f"%{owner_name}%"))
    result = await db.execute(query.order_by(Pet.name))
    return result.scalars().all()


@router.post("", response_model=PetResponse, status_code=201)
async def create_pet(data: PetCreate, db: AsyncSession = Depends(get_db)):
    pet = Pet(**data.model_dump())
    db.add(pet)
    await db.commit()
    await db.refresh(pet)
    return pet


@router.get("/{pet_id}", response_model=PetResponse)
async def get_pet(pet_id: int, db: AsyncSession = Depends(get_db)):
    pet = await db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(404, "Pet not found")
    return pet


@router.put("/{pet_id}", response_model=PetResponse)
async def update_pet(pet_id: int, data: PetUpdate, db: AsyncSession = Depends(get_db)):
    pet = await db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(404, "Pet not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(pet, key, val)
    await db.commit()
    await db.refresh(pet)
    return pet


@router.delete("/{pet_id}", status_code=204)
async def delete_pet(pet_id: int, db: AsyncSession = Depends(get_db)):
    pet = await db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(404, "Pet not found")
    result = await db.execute(
        select(Appointment).where(
            Appointment.pet_id == pet_id, Appointment.status != "cancelled"
        )
    )
    if result.scalars().first():
        raise HTTPException(400, "Cannot delete pet with active appointments")
    await db.delete(pet)
    await db.commit()
