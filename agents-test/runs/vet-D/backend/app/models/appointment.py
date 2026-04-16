"""Appointment database model."""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Appointment(Base):
    """Appointment model representing a scheduled visit."""
    
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    treatment_id = Column(Integer, ForeignKey("treatments.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False, index=True)
    status = Column(String, nullable=False, default="scheduled", index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    pet = relationship("Pet", backref="appointments")
    treatment = relationship("Treatment", backref="appointments")
