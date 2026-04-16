from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Time
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = "sqlite:///./electricity.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # lighting, heating, cooling, appliance, electronics, other
    wattage = Column(Integer, nullable=False)
    location = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    consumption_logs = relationship("ConsumptionLog", back_populates="device")
    schedules = relationship("Schedule", back_populates="device")


class ConsumptionLog(Base):
    __tablename__ = "consumption_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    started_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    kwh = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    
    device = relationship("Device", back_populates="consumption_logs")


class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0-6 (Mon-Sun)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    enabled = Column(Boolean, default=True)
    
    device = relationship("Device", back_populates="schedules")


class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    year_month = Column(String, unique=True, nullable=False)  # YYYY-MM
    budget_kwh = Column(Float, nullable=False)
    price_per_kwh = Column(Float, nullable=False)
    alert_threshold_percent = Column(Integer, default=80)


def init_db():
    """Initialize database and create tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for getting DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
