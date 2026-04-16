from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base

class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Pet(Base):
    __tablename__ = "pets"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    species = Column(String, nullable=False)  # dog, cat, bird, rabbit, other
    breed = Column(String, nullable=True)
    age_years = Column(Float, nullable=False)
    owner_name = Column(String, nullable=False, index=True)
    owner_phone = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    
    appointments = relationship("Appointment", back_populates="pet")

class Treatment(Base):
    __tablename__ = "treatments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    
    appointments = relationship("Appointment", back_populates="treatment")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    treatment_id = Column(Integer, ForeignKey("treatments.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False, index=True)
    status = Column(Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.SCHEDULED)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    pet = relationship("Pet", back_populates="appointments")
    treatment = relationship("Treatment", back_populates="appointments")
