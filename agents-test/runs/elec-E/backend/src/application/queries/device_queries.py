"""Device queries for CQRS read operations."""
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class GetDeviceQuery:
    """Query to get a device by ID."""
    
    device_id: int


@dataclass(frozen=True)
class ListDevicesQuery:
    """Query to list devices with optional filters."""
    
    device_type: str | None = None
    location: str | None = None


@dataclass(frozen=True)
class ListConsumptionQuery:
    """Query to list consumption logs."""
    
    device_id: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


@dataclass(frozen=True)
class GetConsumptionStatsQuery:
    """Query to get consumption statistics."""
    
    period: str
    device_id: int | None = None
    from_date: str | None = None
    to_date: str | None = None


@dataclass(frozen=True)
class ListSchedulesQuery:
    """Query to list schedules."""
    
    device_id: int | None = None


@dataclass(frozen=True)
class GetTodaySchedulesQuery:
    """Query to get today's schedules."""
    
    pass


@dataclass(frozen=True)
class GetBudgetQuery:
    """Query to get budget for a month."""
    
    year_month: str


@dataclass(frozen=True)
class GetBudgetStatusQuery:
    """Query to get budget status with projections."""
    
    year_month: str


@dataclass(frozen=True)
class ListBudgetsQuery:
    """Query to list all budgets."""
    
    pass
