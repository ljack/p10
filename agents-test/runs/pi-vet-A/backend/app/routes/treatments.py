from fastapi import APIRouter, HTTPException
from ..models import TreatmentCreate, TreatmentUpdate, TreatmentResponse
from ..database import get_db

router = APIRouter(prefix="/api/treatments", tags=["treatments"])


@router.get("", response_model=list[TreatmentResponse])
async def list_treatments():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM treatments ORDER BY name")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=TreatmentResponse, status_code=201)
async def create_treatment(treatment: TreatmentCreate):
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO treatments (name, duration_minutes, description, price)
               VALUES (?, ?, ?, ?)""",
            (treatment.name, treatment.duration_minutes, treatment.description, treatment.price),
        )
        await db.commit()
        tid = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM treatments WHERE id = ?", (tid,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.put("/{treatment_id}", response_model=TreatmentResponse)
async def update_treatment(treatment_id: int, treatment: TreatmentUpdate):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM treatments WHERE id = ?", (treatment_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Treatment not found")

        data = treatment.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clause = ", ".join(f"{k} = ?" for k in data)
        values = list(data.values()) + [treatment_id]
        await db.execute(f"UPDATE treatments SET {set_clause} WHERE id = ?", values)
        await db.commit()

        cursor = await db.execute("SELECT * FROM treatments WHERE id = ?", (treatment_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.delete("/{treatment_id}", status_code=204)
async def delete_treatment(treatment_id: int):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM treatments WHERE id = ?", (treatment_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Treatment not found")
        await db.execute("DELETE FROM treatments WHERE id = ?", (treatment_id,))
        await db.commit()
    finally:
        await db.close()
