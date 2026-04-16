from pydantic import BaseModel, Field
from datetime import datetime, time
from typing import Optional, List


# Device schemas
class DeviceBase(BaseModel):
    name: str
    type: str  # lighting, heating, cooling, appliance, electronics, other
    wattage: int
    location: str


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    wattage: Optional[int] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None


class DeviceResponse(DeviceBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class DeviceWithConsumption(DeviceResponse):
    recent_kwh: float = 0.0


# Consumption schemas
class ConsumptionLogCreate(BaseModel):
    device_id: int
    started_at: datetime
    duration_minutes: int


class ConsumptionLogResponse(BaseModel):
    id: int
    device_id: int
    started_at: datetime
    duration_minutes: int
    kwh: float
    recorded_at: datetime
    device_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class ConsumptionStats(BaseModel):
    total_kwh: float
    total_cost: float
    avg_daily_kwh: float
    by_device: List[dict]
    by_type: List[dict]


# Schedule schemas
class ScheduleBase(BaseModel):
    device_id: int
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    enabled: bool = True


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    enabled: Optional[bool] = None


class ScheduleResponse(ScheduleBase):
    id: int
    device_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# Budget schemas
class BudgetBase(BaseModel):
    year_month: str  # YYYY-MM
    budget_kwh: float
    price_per_kwh: float
    alert_threshold_percent: int = 80


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    budget_kwh: Optional[float] = None
    price_per_kwh: Optional[float] = None
    alert_threshold_percent: Optional[int] = None


class BudgetResponse(BudgetBase):
    id: int
    
    class Config:
        from_attributes = True


class BudgetStatus(BaseModel):
    budget_kwh: float
    used_kwh: float
    used_percent: float
    remaining_kwh: float
    projected_end_of_month_kwh: float
    is_over_threshold: bool
    estimated_cost: float
    price_per_kwh: float
