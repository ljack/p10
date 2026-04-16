from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from datetime import datetime
import enum

DATABASE_URL = "sqlite+aiosqlite:///./vet.db"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in-progress"
    completed = "completed"
    cancelled = "cancelled"

class Pet(Base):
    __tablename__ = "pets"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
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
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    
    appointments = relationship("Appointment", back_populates="treatment")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    treatment_id = Column(Integer, ForeignKey("treatments.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.scheduled)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    pet = relationship("Pet", back_populates="appointments")
    treatment = relationship("Treatment", back_populates="appointments")

async def get_db():
    async with async_session_maker() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed treatments
    async with async_session_maker() as session:
        from sqlalchemy import select
        result = await session.execute(select(Treatment))
        if not result.scalars().first():
            treatments = [
                Treatment(name="Vaccination", duration_minutes=30, description="Annual vaccination", price=75.00),
                Treatment(name="Dental Cleaning", duration_minutes=60, description="Professional teeth cleaning", price=150.00),
                Treatment(name="X-Ray", duration_minutes=45, description="Diagnostic X-ray imaging", price=120.00),
                Treatment(name="General Checkup", duration_minutes=30, description="Routine health examination", price=60.00),
                Treatment(name="Surgery Consultation", duration_minutes=45, description="Pre-surgery consultation", price=90.00),
            ]
            session.add_all(treatments)
            await session.commit()
