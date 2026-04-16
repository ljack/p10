from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Numeric, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum

DATABASE_URL = "sqlite:///./vet_clinic.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in-progress"
    completed = "completed"
    cancelled = "cancelled"

class Pet(Base):
    __tablename__ = "pets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    species = Column(String, nullable=False)
    breed = Column(String, nullable=True)
    age_years = Column(Float, nullable=False)
    owner_name = Column(String, nullable=False)
    owner_phone = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    
    appointments = relationship("Appointment", back_populates="pet")

class Treatment(Base):
    __tablename__ = "treatments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    
    appointments = relationship("Appointment", back_populates="treatment")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    treatment_id = Column(Integer, ForeignKey("treatments.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="scheduled")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    pet = relationship("Pet", back_populates="appointments")
    treatment = relationship("Treatment", back_populates="appointments")

def init_db():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        if db.query(Treatment).count() == 0:
            sample_treatments = [
                Treatment(name="Vaccination", duration_minutes=30, description="Annual vaccination", price=75.00),
                Treatment(name="Dental Cleaning", duration_minutes=60, description="Professional dental cleaning", price=150.00),
                Treatment(name="X-ray", duration_minutes=45, description="Diagnostic X-ray imaging", price=120.00),
                Treatment(name="General Checkup", duration_minutes=30, description="Routine health examination", price=60.00),
                Treatment(name="Emergency Care", duration_minutes=90, description="Emergency treatment", price=200.00),
            ]
            db.add_all(sample_treatments)
            db.commit()
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
