"""Treatment database model."""
from sqlalchemy import Column, Integer, String, Float, Text
from app.database import Base


class Treatment(Base):
    """Treatment model representing a medical service."""
    
    __tablename__ = "treatments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
