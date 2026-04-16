"""Treatment endpoints router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.treatment import Treatment
from app.schemas.treatment import TreatmentCreate, TreatmentUpdate, TreatmentResponse

router = APIRouter(prefix="/api/treatments", tags=["treatments"])


@router.post("", response_model=TreatmentResponse, status_code=status.HTTP_201_CREATED)
def create_treatment(treatment: TreatmentCreate, db: Session = Depends(get_db)):
    """Create a new treatment."""
    db_treatment = Treatment(**treatment.model_dump())
    db.add(db_treatment)
    db.commit()
    db.refresh(db_treatment)
    return db_treatment


@router.get("", response_model=List[TreatmentResponse])
def get_treatments(db: Session = Depends(get_db)):
    """Get all treatments."""
    return db.query(Treatment).all()


@router.put("/{treatment_id}", response_model=TreatmentResponse)
def update_treatment(treatment_id: int, treatment_update: TreatmentUpdate, db: Session = Depends(get_db)):
    """Update a treatment's information."""
    db_treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not db_treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    for key, value in treatment_update.model_dump().items():
        setattr(db_treatment, key, value)
    
    db.commit()
    db.refresh(db_treatment)
    return db_treatment


@router.delete("/{treatment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_treatment(treatment_id: int, db: Session = Depends(get_db)):
    """Delete a treatment."""
    db_treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not db_treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    db.delete(db_treatment)
    db.commit()
    return None
