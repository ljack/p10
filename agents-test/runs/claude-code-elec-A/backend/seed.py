import random
from datetime import datetime, timedelta

from database import database
from models import budgets, consumption_logs, devices, schedules


async def seed_data():
    """Seed the database with realistic Finnish home electricity data."""

    # Check if data already exists
    query = devices.select()
    existing = await database.fetch_all(query)
    if existing:
        return

    # --- Devices ---
    seed_devices = [
        {"name": "Olohuoneen ilmalämpöpumppu", "type": "heating", "wattage": 1500, "location": "Olohuone"},
        {"name": "Keittiön liesi", "type": "appliance", "wattage": 2000, "location": "Keittiö"},
        {"name": "Pyykinpesukone", "type": "appliance", "wattage": 500, "location": "Kodinhoitohuone"},
        {"name": "Makuuhuoneen valaistus", "type": "lighting", "wattage": 60, "location": "Makuuhuone"},
        {"name": "Tietokone ja näyttö", "type": "electronics", "wattage": 350, "location": "Työhuone"},
        {"name": "Jääkaappi-pakastin", "type": "appliance", "wattage": 150, "location": "Keittiö"},
        {"name": "Saunan kiuas", "type": "heating", "wattage": 6000, "location": "Sauna"},
        {"name": "Lattialämmitys WC", "type": "heating", "wattage": 400, "location": "Kylpyhuone"},
    ]

    device_ids = []
    for dev in seed_devices:
        device_id = await database.execute(
            devices.insert().values(**dev, is_active=True)
        )
        device_ids.append(device_id)

    # --- Consumption logs (last 30 days) ---
    now = datetime(2026, 4, 15, 12, 0, 0)
    random.seed(42)

    for _ in range(45):
        device_idx = random.randint(0, len(seed_devices) - 1)
        device_id = device_ids[device_idx]
        wattage = seed_devices[device_idx]["wattage"]

        days_ago = random.randint(0, 29)
        hour = random.randint(6, 22)
        minute = random.choice([0, 15, 30, 45])
        started_at = now - timedelta(days=days_ago, hours=random.randint(0, 5))
        started_at = started_at.replace(hour=hour, minute=minute, second=0, microsecond=0)

        duration = random.choice([15, 30, 45, 60, 90, 120, 180])
        # Sauna sessions are shorter but intense
        if seed_devices[device_idx]["name"] == "Saunan kiuas":
            duration = random.choice([60, 90, 120])
        # Fridge runs in short bursts
        if seed_devices[device_idx]["name"] == "Jääkaappi-pakastin":
            duration = random.choice([30, 60, 120, 180, 240])

        kwh = round(wattage * duration / 60 / 1000, 4)

        await database.execute(
            consumption_logs.insert().values(
                device_id=device_id,
                started_at=started_at,
                duration_minutes=duration,
                kwh=kwh,
            )
        )

    # --- Schedules ---
    seed_schedules = [
        {
            "device_id": device_ids[0],  # Heat pump
            "day_of_week": 0,
            "start_time": "07:00",
            "end_time": "22:00",
            "enabled": True,
        },
        {
            "device_id": device_ids[3],  # Bedroom lighting
            "day_of_week": 2,
            "start_time": "18:00",
            "end_time": "23:00",
            "enabled": True,
        },
        {
            "device_id": device_ids[6],  # Sauna
            "day_of_week": 5,
            "start_time": "17:00",
            "end_time": "20:00",
            "enabled": True,
        },
    ]

    for sched in seed_schedules:
        await database.execute(schedules.insert().values(**sched))

    # --- Budget for current month ---
    await database.execute(
        budgets.insert().values(
            year_month="2026-04",
            budget_kwh=450.0,
            price_per_kwh=0.12,
            alert_threshold_percent=80,
        )
    )

    print("Seed data inserted successfully.")
