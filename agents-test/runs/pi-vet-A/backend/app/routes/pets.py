from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..models import PetCreate, PetUpdate, PetResponse
from ..database import get_db

router = APIRouter(prefix="/api/pets", tags=["pets"])


@router.get("", response_model=list[PetResponse])
async def list_pets(owner_name: Optional[str] = Query(None)):
    db = await get_db()
    try:
        if owner_name:
            cursor = await db.execute(
                "SELECT * FROM pets WHERE owner_name LIKE ? ORDER BY name",
                (f"%{owner_name}%",),
            )
        else:
            cursor = await db.execute("SELECT * FROM pets ORDER BY name")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=PetResponse, status_code=201)
async def create_pet(pet: PetCreate):
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO pets (name, species, breed, age_years, owner_name, owner_phone, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (pet.name, pet.species.value, pet.breed, pet.age_years,
             pet.owner_name, pet.owner_phone, pet.notes),
        )
        await db.commit()
        pet_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM pets WHERE id = ?", (pet_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.get("/{pet_id}", response_model=PetResponse)
async def get_pet(pet_id: int):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM pets WHERE id = ?", (pet_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pet not found")
        return dict(row)
    finally:
        await db.close()


@router.put("/{pet_id}", response_model=PetResponse)
async def update_pet(pet_id: int, pet: PetUpdate):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM pets WHERE id = ?", (pet_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Pet not found")

        data = pet.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Convert species enum to value
        if "species" in data and data["species"] is not None:
            data["species"] = data["species"].value

        set_clause = ", ".join(f"{k} = ?" for k in data)
        values = list(data.values()) + [pet_id]
        await db.execute(f"UPDATE pets SET {set_clause} WHERE id = ?", values)
        await db.commit()

        cursor = await db.execute("SELECT * FROM pets WHERE id = ?", (pet_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.delete("/{pet_id}", status_code=204)
async def delete_pet(pet_id: int):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM pets WHERE id = ?", (pet_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Pet not found")
        await db.execute("DELETE FROM pets WHERE id = ?", (pet_id,))
        await db.commit()
    finally:
        await db.close()
