"""Appointment Pydantic schemas for validation."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class AppointmentStatus(str, Enum):
    """Valid appointment statuses."""
    scheduled = "scheduled"
    in_progress = "in-progress"
    completed = "completed"
    cancelled = "cancelled"


class AppointmentBase(BaseModel):
    """Base appointment schema with common fields."""
    pet_id: int = Field(..., gt=0)
    treatment_id: int = Field(..., gt=0)
    scheduled_at: datetime
    status: AppointmentStatus = AppointmentStatus.scheduled
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    """Schema for creating an appointment."""
    pass


class AppointmentUpdate(AppointmentBase):
    """Schema for updating an appointment."""
    pass


class AppointmentResponse(AppointmentBase):
    """Schema for appointment response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime


class AvailableSlot(BaseModel):
    """Schema for available time slot."""
    time: str
    datetime: datetime
