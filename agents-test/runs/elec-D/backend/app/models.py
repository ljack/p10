"""Database models."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Time
from app.database import Base


class Device(Base):
    """Device model."""
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # lighting, heating, cooling, appliance, electronics, other
    wattage = Column(Integer, nullable=False)
    location = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ConsumptionLog(Base):
    """Consumption log model."""
    __tablename__ = "consumption_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    started_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    kwh = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Schedule(Base):
    """Schedule model."""
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0-6 (Mon-Sun)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)


class Budget(Base):
    """Budget model."""
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    year_month = Column(String, unique=True, nullable=False)  # YYYY-MM
    budget_kwh = Column(Float, nullable=False)
    price_per_kwh = Column(Float, nullable=False)
    alert_threshold_percent = Column(Integer, default=80, nullable=False)
