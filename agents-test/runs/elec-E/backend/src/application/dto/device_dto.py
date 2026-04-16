"""Device DTOs for application layer."""
from dataclasses import dataclass
from datetime import datetime


@dataclass
class DeviceDTO:
    """Device data transfer object."""
    
    id: int
    name: str
    type: str
    wattage: int
    location: str
    is_active: bool
    created_at: datetime


@dataclass
class ConsumptionLogDTO:
    """Consumption log data transfer object."""
    
    id: int
    device_id: int
    started_at: datetime
    duration_minutes: int
    kwh: float
    recorded_at: datetime


@dataclass
class ScheduleDTO:
    """Schedule data transfer object."""
    
    id: int
    device_id: int
    day_of_week: int
    start_time: str
    end_time: str
    enabled: bool


@dataclass
class BudgetDTO:
    """Budget data transfer object."""
    
    id: int
    year_month: str
    budget_kwh: float
    price_per_kwh: float
    alert_threshold_percent: int


@dataclass
class ConsumptionStatsDTO:
    """Consumption statistics data transfer object."""
    
    total_kwh: float
    total_cost: float
    avg_daily_kwh: float
    by_device: dict[str, float]
    by_type: dict[str, float]


@dataclass
class BudgetStatusDTO:
    """Budget status data transfer object."""
    
    budget_kwh: float
    used_kwh: float
    used_percent: float
    remaining_kwh: float
    projected_end_of_month_kwh: float
    is_over_threshold: bool
    estimated_cost: float
