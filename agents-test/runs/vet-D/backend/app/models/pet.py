"""Pet database model."""
from sqlalchemy import Column, Integer, String, Float, Text
from app.database import Base


class Pet(Base):
    """Pet model representing an animal patient."""
    
    __tablename__ = "pets"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    species = Column(String, nullable=False)
    breed = Column(String, nullable=True)
    age_years = Column(Float, nullable=False)
    owner_name = Column(String, nullable=False, index=True)
    owner_phone = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
