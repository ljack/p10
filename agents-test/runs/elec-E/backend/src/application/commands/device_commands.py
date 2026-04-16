"""Device commands for CQRS write operations."""
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class CreateDeviceCommand:
    """Command to create a new device."""
    
    name: str
    type: str
    wattage: int
    location: str


@dataclass(frozen=True)
class UpdateDeviceCommand:
    """Command to update a device."""
    
    device_id: int
    name: str
    location: str


@dataclass(frozen=True)
class DeleteDeviceCommand:
    """Command to delete (deactivate) a device."""
    
    device_id: int


@dataclass(frozen=True)
class CreateConsumptionCommand:
    """Command to log consumption."""
    
    device_id: int
    started_at: datetime
    duration_minutes: int


@dataclass(frozen=True)
class CreateScheduleCommand:
    """Command to create a schedule."""
    
    device_id: int
    day_of_week: int
    start_time: str
    end_time: str


@dataclass(frozen=True)
class UpdateScheduleCommand:
    """Command to update a schedule."""
    
    schedule_id: int
    day_of_week: int
    start_time: str
    end_time: str
    enabled: bool


@dataclass(frozen=True)
class DeleteScheduleCommand:
    """Command to delete a schedule."""
    
    schedule_id: int


@dataclass(frozen=True)
class CreateBudgetCommand:
    """Command to create a budget."""
    
    year_month: str
    budget_kwh: float
    price_per_kwh: float
    alert_threshold_percent: int = 80


@dataclass(frozen=True)
class UpdateBudgetCommand:
    """Command to update a budget."""
    
    year_month: str
    budget_kwh: float
    price_per_kwh: float
    alert_threshold_percent: int
