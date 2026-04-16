from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Time
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    wattage = Column(Integer, nullable=False)
    location = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    consumption_logs = relationship("ConsumptionLog", back_populates="device")
    schedules = relationship("Schedule", back_populates="device")

class ConsumptionLog(Base):
    __tablename__ = "consumption_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    started_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    kwh = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    
    device = relationship("Device", back_populates="consumption_logs")

class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    enabled = Column(Boolean, default=True)
    
    device = relationship("Device", back_populates="schedules")

class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    year_month = Column(String, unique=True, nullable=False)
    budget_kwh = Column(Float, nullable=False)
    price_per_kwh = Column(Float, nullable=False)
    alert_threshold_percent = Column(Integer, default=80)
