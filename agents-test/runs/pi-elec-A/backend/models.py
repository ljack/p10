from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# --- Device ---
class DeviceCreate(BaseModel):
    name: str
    type: str = Field(..., pattern=r"^(lighting|heating|cooling|appliance|electronics|other)$")
    wattage: int = Field(..., gt=0)
    location: str

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = Field(None, pattern=r"^(lighting|heating|cooling|appliance|electronics|other)$")
    wattage: Optional[int] = Field(None, gt=0)
    location: Optional[str] = None
    is_active: Optional[bool] = None

class DeviceResponse(BaseModel):
    id: int
    name: str
    type: str
    wattage: int
    location: str
    is_active: bool
    created_at: str


# --- Consumption ---
class ConsumptionCreate(BaseModel):
    device_id: int
    started_at: str
    duration_minutes: int = Field(..., gt=0)

class ConsumptionResponse(BaseModel):
    id: int
    device_id: int
    started_at: str
    duration_minutes: int
    kwh: float
    recorded_at: str


# --- Schedule ---
class ScheduleCreate(BaseModel):
    device_id: int
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str
    end_time: str
    enabled: bool = True

class ScheduleUpdate(BaseModel):
    device_id: Optional[int] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    enabled: Optional[bool] = None

class ScheduleResponse(BaseModel):
    id: int
    device_id: int
    day_of_week: int
    start_time: str
    end_time: str
    enabled: bool


# --- Budget ---
class BudgetCreate(BaseModel):
    year_month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    budget_kwh: float = Field(..., gt=0)
    price_per_kwh: float = Field(..., gt=0)
    alert_threshold_percent: int = Field(80, ge=0, le=100)

class BudgetUpdate(BaseModel):
    budget_kwh: Optional[float] = Field(None, gt=0)
    price_per_kwh: Optional[float] = Field(None, gt=0)
    alert_threshold_percent: Optional[int] = Field(None, ge=0, le=100)

class BudgetResponse(BaseModel):
    id: int
    year_month: str
    budget_kwh: float
    price_per_kwh: float
    alert_threshold_percent: int
