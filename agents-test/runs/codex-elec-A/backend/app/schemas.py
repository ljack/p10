from __future__ import annotations

from datetime import date, datetime, time
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DeviceType(StrEnum):
    LIGHTING = "lighting"
    HEATING = "heating"
    COOLING = "cooling"
    APPLIANCE = "appliance"
    ELECTRONICS = "electronics"
    OTHER = "other"


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class DeviceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: DeviceType
    wattage: int = Field(..., gt=0, le=100_000)
    location: str = Field(..., min_length=1, max_length=120)

    @field_validator("name", "location")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    type: DeviceType | None = None
    wattage: int | None = Field(None, gt=0, le=100_000)
    location: str | None = Field(None, min_length=1, max_length=120)
    is_active: bool | None = None

    @field_validator("name", "location")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value


class DeviceOut(ORMModel):
    id: int
    name: str
    type: DeviceType
    wattage: int
    location: str
    is_active: bool
    created_at: datetime
    current_month_kwh: float = 0.0


class DeviceMiniOut(ORMModel):
    id: int
    name: str
    type: DeviceType
    location: str
    wattage: int
    is_active: bool


class ConsumptionCreate(BaseModel):
    device_id: int = Field(..., gt=0)
    started_at: datetime
    duration_minutes: int = Field(..., gt=0, le=24 * 60)


class ConsumptionSummaryOut(ORMModel):
    id: int
    device_id: int
    started_at: datetime
    duration_minutes: int
    kwh: float
    recorded_at: datetime
    estimated_cost: float = 0.0


class ConsumptionLogOut(ConsumptionSummaryOut):
    device: DeviceMiniOut


class DeviceDetailOut(DeviceOut):
    total_consumption_kwh: float
    recent_consumption: list[ConsumptionSummaryOut]


class DeviceBreakdownItem(BaseModel):
    device_id: int
    name: str
    type: DeviceType
    location: str
    total_kwh: float
    total_cost: float
    log_count: int


class TypeBreakdownItem(BaseModel):
    type: DeviceType
    total_kwh: float
    total_cost: float
    log_count: int


class DailyUsageItem(BaseModel):
    day: date
    total_kwh: float


class ConsumptionStatsOut(BaseModel):
    period: str
    from_date: date
    to_date: date
    total_kwh: float
    total_cost: float
    avg_daily_kwh: float
    by_device: list[DeviceBreakdownItem]
    by_type: list[TypeBreakdownItem]
    daily_usage: list[DailyUsageItem]


class ScheduleBase(BaseModel):
    device_id: int = Field(..., gt=0)
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: time
    end_time: time
    enabled: bool = True

    @field_validator("end_time")
    @classmethod
    def validate_time_order(cls, value: time, info) -> time:
        start_time = info.data.get("start_time")
        if start_time is not None and value <= start_time:
            raise ValueError("end_time must be later than start_time")
        return value


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    device_id: int | None = Field(None, gt=0)
    day_of_week: int | None = Field(None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    enabled: bool | None = None


class ScheduleOut(ORMModel):
    id: int
    device_id: int
    day_of_week: int
    start_time: time
    end_time: time
    enabled: bool
    device: DeviceMiniOut


class BudgetBase(BaseModel):
    year_month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    budget_kwh: float = Field(..., gt=0)
    price_per_kwh: float = Field(..., gt=0)
    alert_threshold_percent: int = Field(80, ge=1, le=100)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    budget_kwh: float | None = Field(None, gt=0)
    price_per_kwh: float | None = Field(None, gt=0)
    alert_threshold_percent: int | None = Field(None, ge=1, le=100)


class BudgetOut(ORMModel):
    id: int
    year_month: str
    budget_kwh: float
    price_per_kwh: float
    alert_threshold_percent: int


class BudgetStatusOut(BaseModel):
    year_month: str
    budget_kwh: float
    used_kwh: float
    used_percent: float
    remaining_kwh: float
    projected_end_of_month_kwh: float
    is_over_threshold: bool
    estimated_cost: float


class BudgetDetailOut(BudgetOut):
    used_kwh: float
    used_percent: float
    remaining_kwh: float
    projected_end_of_month_kwh: float
    is_over_threshold: bool
    estimated_cost: float
