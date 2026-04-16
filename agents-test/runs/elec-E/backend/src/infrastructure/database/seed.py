"""Database seeding script."""
import asyncio
from datetime import datetime, timedelta
from infrastructure.database.connection import DatabaseConnection
from infrastructure.database.schema import initialize_database


SAMPLE_DEVICES = [
    ("Living room AC", "cooling", 1500, "Living room"),
    ("Kitchen oven", "appliance", 2000, "Kitchen"),
    ("Bedroom heater", "heating", 1200, "Bedroom"),
    ("Office computer", "electronics", 300, "Office"),
    ("Hallway lights", "lighting", 60, "Hallway"),
    ("Washing machine", "appliance", 1800, "Laundry"),
    ("TV", "electronics", 150, "Living room"),
    ("Refrigerator", "appliance", 200, "Kitchen"),
]


async def seed_database() -> None:
    """Seed database with sample data."""
    db = DatabaseConnection("electricity.db")
    await db.connect()
    await initialize_database(await db.connect())
    
    for name, dtype, wattage, location in SAMPLE_DEVICES:
        await db.execute(
            "INSERT INTO devices (name, type, wattage, location) VALUES (?, ?, ?, ?)",
            (name, dtype, wattage, location)
        )
    
    now = datetime.utcnow()
    for device_id in range(1, 9):
        for i in range(10):
            started = now - timedelta(days=i, hours=2)
            duration = 120
            kwh = SAMPLE_DEVICES[device_id-1][2] * duration / 60 / 1000
            await db.execute(
                """INSERT INTO consumption_logs (device_id, started_at, duration_minutes, kwh)
                   VALUES (?, ?, ?, ?)""",
                (device_id, started, duration, kwh)
            )
    
    await db.execute(
        """INSERT INTO budgets (year_month, budget_kwh, price_per_kwh, alert_threshold_percent)
           VALUES ('2026-04', 500, 0.15, 80)"""
    )
    
    await db.commit()
    await db.close()
    print("Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
