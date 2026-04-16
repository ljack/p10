"""Database models and setup."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from ..domain.value_objects import Species, AppointmentStatus


Base = declarative_base()


class PetModel(Base):
    """Pet database model."""
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    species = Column(Enum(Species), nullable=False)
    breed = Column(String(100), nullable=True)
    age_years = Column(Float, nullable=False)
    owner_name = Column(String(100), nullable=False)
    owner_phone = Column(String(20), nullable=False)
    notes = Column(Text, nullable=True)


class TreatmentModel(Base):
    """Treatment database model."""
    __tablename__ = "treatments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)


class AppointmentModel(Base):
    """Appointment database model."""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    treatment_id = Column(Integer, ForeignKey("treatments.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(Enum(AppointmentStatus), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


async def create_tables(engine) -> None:
    """Create database tables.
    
    Args:
        engine: SQLAlchemy engine
    Returns: None
    Raises: None
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def create_session_factory(database_url: str) -> sessionmaker:
    """Create session factory.
    
    Args:
        database_url: Database URL
    Returns: Session factory
    Raises: None
    """
    engine = create_async_engine(database_url, echo=False)
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
