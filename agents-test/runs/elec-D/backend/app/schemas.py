"""Pydantic schemas for request/response validation."""
from datetime import datetime, time
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


# Device Schemas
class DeviceBase(BaseModel):
    """Base device schema."""
    name: str = Field(..., min_length=1, max_length=200)
    type: Literal["lighting", "heating", "cooling", "appliance", "electronics", "other"]
    wattage: int = Field(..., gt=0)
    location: str = Field(..., min_length=1, max_length=200)


class DeviceCreate(DeviceBase):
    """Schema for creating a device."""
    pass


class DeviceUpdate(DeviceBase):
    """Schema for updating a device."""
    pass


class DeviceResponse(DeviceBase):
    """Schema for device response."""
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class DeviceDetailResponse(DeviceResponse):
    """Schema for device detail response with recent consumption."""
    recent_consumption: Optional[list] = []


# Consumption Schemas
class ConsumptionLogCreate(BaseModel):
    """Schema for creating a consumption log."""
    device_id: int
    started_at: datetime
    duration_minutes: int = Field(..., gt=0)


class ConsumptionLogResponse(BaseModel):
    """Schema for consumption log response."""
    id: int
    device_id: int
    started_at: datetime
    duration_minutes: int
    kwh: float
    recorded_at: datetime
    
    class Config:
        from_attributes = True


# Schedule Schemas
class ScheduleBase(BaseModel):
    """Base schedule schema."""
    device_id: int
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: time
    end_time: time
    enabled: bool = True


class ScheduleCreate(ScheduleBase):
    """Schema for creating a schedule."""
    pass


class ScheduleUpdate(BaseModel):
    """Schema for updating a schedule."""
    device_id: Optional[int] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    enabled: Optional[bool] = None


class ScheduleResponse(ScheduleBase):
    """Schema for schedule response."""
    id: int
    
    class Config:
        from_attributes = True


# Budget Schemas
class BudgetBase(BaseModel):
    """Base budget schema."""
    year_month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    budget_kwh: float = Field(..., gt=0)
    price_per_kwh: float = Field(..., gt=0)
    alert_threshold_percent: int = Field(default=80, ge=1, le=100)


class BudgetCreate(BudgetBase):
    """Schema for creating a budget."""
    pass


class BudgetUpdate(BaseModel):
    """Schema for updating a budget."""
    budget_kwh: Optional[float] = Field(None, gt=0)
    price_per_kwh: Optional[float] = Field(None, gt=0)
    alert_threshold_percent: Optional[int] = Field(None, ge=1, le=100)


class BudgetResponse(BudgetBase):
    """Schema for budget response."""
    id: int
    
    class Config:
        from_attributes = True


class BudgetStatusResponse(BaseModel):
    """Schema for budget status response."""
    budget_kwh: float
    used_kwh: float
    used_percent: float
    remaining_kwh: float
    projected_end_of_month_kwh: float
    is_over_threshold: bool
    estimated_cost: float


# Stats Schemas
class DeviceBreakdown(BaseModel):
    """Device breakdown in stats."""
    device_id: int
    device_name: str
    total_kwh: float
    total_cost: float


class TypeBreakdown(BaseModel):
    """Type breakdown in stats."""
    type: str
    total_kwh: float
    total_cost: float


class ConsumptionStatsResponse(BaseModel):
    """Schema for consumption stats response."""
    total_kwh: float
    total_cost: float
    avg_daily_kwh: float
    by_device: list[DeviceBreakdown]
    by_type: list[TypeBreakdown]
