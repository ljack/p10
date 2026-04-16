from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------

class DeviceCreate(BaseModel):
    name: str
    type: str = Field(..., pattern="^(lighting|heating|cooling|appliance|electronics|other)$")
    wattage: int = Field(..., gt=0)
    location: str


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = Field(
        None, pattern="^(lighting|heating|cooling|appliance|electronics|other)$"
    )
    wattage: Optional[int] = Field(None, gt=0)
    location: Optional[str] = None
    is_active: Optional[bool] = None


class DeviceOut(BaseModel):
    id: int
    name: str
    type: str
    wattage: int
    location: str
    is_active: bool
    created_at: datetime


class DeviceDetail(DeviceOut):
    recent_consumption: list[dict] = []


# ---------------------------------------------------------------------------
# Consumption
# ---------------------------------------------------------------------------

class ConsumptionCreate(BaseModel):
    device_id: int
    started_at: datetime
    duration_minutes: int = Field(..., gt=0)


class ConsumptionOut(BaseModel):
    id: int
    device_id: int
    device_name: Optional[str] = None
    started_at: datetime
    duration_minutes: int
    kwh: float
    recorded_at: datetime


class DeviceBreakdown(BaseModel):
    device_id: int
    device_name: str
    total_kwh: float


class TypeBreakdown(BaseModel):
    type: str
    total_kwh: float


class ConsumptionStats(BaseModel):
    total_kwh: float
    total_cost: float
    avg_daily_kwh: float
    by_device: list[DeviceBreakdown]
    by_type: list[TypeBreakdown]


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

class ScheduleCreate(BaseModel):
    device_id: int
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")


class ScheduleUpdate(BaseModel):
    device_id: Optional[int] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    enabled: Optional[bool] = None


class ScheduleOut(BaseModel):
    id: int
    device_id: int
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    day_of_week: int
    start_time: str
    end_time: str
    enabled: bool


# ---------------------------------------------------------------------------
# Budget
# ---------------------------------------------------------------------------

class BudgetCreate(BaseModel):
    year_month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    budget_kwh: float = Field(..., gt=0)
    price_per_kwh: float = Field(..., gt=0)
    alert_threshold_percent: int = Field(default=80, ge=1, le=100)


class BudgetUpdate(BaseModel):
    budget_kwh: Optional[float] = Field(None, gt=0)
    price_per_kwh: Optional[float] = Field(None, gt=0)
    alert_threshold_percent: Optional[int] = Field(None, ge=1, le=100)


class BudgetOut(BaseModel):
    id: int
    year_month: str
    budget_kwh: float
    price_per_kwh: float
    alert_threshold_percent: int


class BudgetWithUsage(BudgetOut):
    used_kwh: float


class BudgetStatus(BaseModel):
    budget_kwh: float
    used_kwh: float
    used_percent: float
    remaining_kwh: float
    projected_end_of_month_kwh: float
    is_over_threshold: bool
    estimated_cost: float
    projected_cost: float
