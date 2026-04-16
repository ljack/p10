from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from . import models
from .services import calculate_kwh


SAMPLE_DEVICES = [
    {"name": "Living room AC", "type": "cooling", "wattage": 1200, "location": "Living room"},
    {"name": "Kitchen oven", "type": "appliance", "wattage": 2400, "location": "Kitchen"},
    {"name": "Water heater", "type": "heating", "wattage": 3000, "location": "Utility room"},
    {"name": "Bedroom lights", "type": "lighting", "wattage": 120, "location": "Bedroom"},
    {"name": "Home office computer", "type": "electronics", "wattage": 350, "location": "Office"},
    {"name": "Laundry washer", "type": "appliance", "wattage": 900, "location": "Laundry"},
    {"name": "Hallway radiator", "type": "heating", "wattage": 1500, "location": "Hallway"},
]


async def seed_database(session: AsyncSession) -> None:
    existing_devices = await session.execute(select(func.count(models.Device.id)))
    if existing_devices.scalar_one():
        return

    devices = [models.Device(**payload) for payload in SAMPLE_DEVICES]
    session.add_all(devices)
    await session.flush()

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def log_for(device: models.Device, days_ago: int, hour: int, duration_minutes: int) -> models.ConsumptionLog:
        started_at = now - timedelta(days=days_ago)
        started_at = started_at.replace(hour=hour, minute=0, second=0, microsecond=0)
        if started_at < month_start:
            started_at = month_start + timedelta(days=days_ago % 5, hours=hour)
        return models.ConsumptionLog(
            device_id=device.id,
            started_at=started_at,
            duration_minutes=duration_minutes,
            kwh=calculate_kwh(device.wattage, duration_minutes),
        )

    logs = [
        log_for(devices[0], 1, 15, 180),
        log_for(devices[0], 4, 14, 150),
        log_for(devices[1], 2, 18, 70),
        log_for(devices[1], 6, 17, 55),
        log_for(devices[2], 0, 6, 90),
        log_for(devices[2], 3, 6, 110),
        log_for(devices[2], 7, 7, 95),
        log_for(devices[3], 0, 20, 240),
        log_for(devices[3], 2, 20, 180),
        log_for(devices[4], 1, 9, 510),
        log_for(devices[4], 5, 9, 420),
        log_for(devices[5], 3, 11, 85),
        log_for(devices[5], 8, 10, 65),
        log_for(devices[6], 1, 5, 120),
        log_for(devices[6], 9, 5, 160),
        log_for(devices[1], 10, 12, 45),
        log_for(devices[0], 11, 16, 200),
        log_for(devices[4], 12, 10, 390),
    ]
    session.add_all(logs)

    schedules = [
        models.Schedule(device_id=devices[2].id, day_of_week=0, start_time=datetime.strptime("06:00", "%H:%M").time(), end_time=datetime.strptime("07:30", "%H:%M").time()),
        models.Schedule(device_id=devices[2].id, day_of_week=2, start_time=datetime.strptime("06:00", "%H:%M").time(), end_time=datetime.strptime("07:30", "%H:%M").time()),
        models.Schedule(device_id=devices[6].id, day_of_week=4, start_time=datetime.strptime("05:30", "%H:%M").time(), end_time=datetime.strptime("07:00", "%H:%M").time()),
        models.Schedule(device_id=devices[3].id, day_of_week=6, start_time=datetime.strptime("19:00", "%H:%M").time(), end_time=datetime.strptime("23:00", "%H:%M").time()),
        models.Schedule(device_id=devices[0].id, day_of_week=5, start_time=datetime.strptime("14:00", "%H:%M").time(), end_time=datetime.strptime("18:00", "%H:%M").time()),
    ]
    session.add_all(schedules)

    current_year_month = now.strftime("%Y-%m")
    previous_year_month = (month_start - timedelta(days=1)).strftime("%Y-%m")
    budgets = [
        models.Budget(year_month=current_year_month, budget_kwh=380.0, price_per_kwh=0.23, alert_threshold_percent=80),
        models.Budget(year_month=previous_year_month, budget_kwh=360.0, price_per_kwh=0.22, alert_threshold_percent=80),
    ]
    session.add_all(budgets)

    await session.commit()
