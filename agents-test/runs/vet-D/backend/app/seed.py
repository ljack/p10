"""Seed database with initial data."""
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.treatment import Treatment


def seed_treatments(db: Session):
    """Seed initial treatments if database is empty."""
    # Check if treatments already exist
    existing_count = db.query(Treatment).count()
    if existing_count > 0:
        return
    
    # Seed treatments
    treatments = [
        Treatment(
            name="Vaccination",
            duration_minutes=30,
            description="Annual vaccination for common diseases",
            price=75.00
        ),
        Treatment(
            name="Dental Cleaning",
            duration_minutes=60,
            description="Professional teeth cleaning and examination",
            price=200.00
        ),
        Treatment(
            name="X-ray",
            duration_minutes=45,
            description="Diagnostic X-ray imaging",
            price=150.00
        ),
        Treatment(
            name="General Checkup",
            duration_minutes=30,
            description="Routine health examination",
            price=65.00
        ),
        Treatment(
            name="Surgery Consultation",
            duration_minutes=45,
            description="Pre-surgery consultation and assessment",
            price=120.00
        ),
    ]
    
    db.add_all(treatments)
    db.commit()
    print("✅ Seeded 5 initial treatments")


def seed_all():
    """Run all seed functions."""
    db = SessionLocal()
    try:
        seed_treatments(db)
    finally:
        db.close()
