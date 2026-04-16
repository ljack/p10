import aiosqlite
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "electricity.db"

async def get_db():
    """Get database connection."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db

async def init_database():
    """Initialize database tables."""
    db = await get_db()
    try:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                wattage INTEGER NOT NULL,
                location TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS consumption_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                started_at TIMESTAMP NOT NULL,
                duration_minutes INTEGER NOT NULL,
                kwh REAL NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id)
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                enabled BOOLEAN DEFAULT 1,
                FOREIGN KEY (device_id) REFERENCES devices(id)
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                year_month TEXT UNIQUE NOT NULL,
                budget_kwh REAL NOT NULL,
                price_per_kwh REAL NOT NULL,
                alert_threshold_percent INTEGER DEFAULT 80
            )
        """)
        
        await db.commit()
    finally:
        await db.close()

async def seed_data():
    """Seed initial data if database is empty."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as count FROM devices")
        row = await cursor.fetchone()
        
        if row["count"] == 0:
            # Seed devices
            devices = [
                ("Living Room AC", "cooling", 2000, "Living Room"),
                ("Kitchen Oven", "heating", 3000, "Kitchen"),
                ("Bedroom Heater", "heating", 1500, "Bedroom"),
                ("Office PC", "electronics", 300, "Office"),
                ("Living Room TV", "electronics", 150, "Living Room"),
                ("Kitchen Refrigerator", "appliance", 200, "Kitchen"),
                ("Bathroom Heater", "heating", 2000, "Bathroom"),
                ("Hallway Lights", "lighting", 60, "Hallway"),
            ]
            
            for name, dtype, wattage, location in devices:
                await db.execute(
                    "INSERT INTO devices (name, type, wattage, location) VALUES (?, ?, ?, ?)",
                    (name, dtype, wattage, location)
                )
            
            # Seed some consumption logs (last 7 days)
            from datetime import timedelta
            base_date = datetime.now() - timedelta(days=7)
            
            consumption_data = [
                (1, base_date, 180),  # AC 3 hours
                (2, base_date, 60),   # Oven 1 hour
                (4, base_date + timedelta(days=1), 480),  # PC 8 hours
                (5, base_date + timedelta(days=1), 240),  # TV 4 hours
                (1, base_date + timedelta(days=2), 240),  # AC 4 hours
                (3, base_date + timedelta(days=2), 300),  # Heater 5 hours
                (6, base_date + timedelta(days=3), 1440), # Fridge 24 hours
                (2, base_date + timedelta(days=4), 45),   # Oven 45 min
                (4, base_date + timedelta(days=5), 540),  # PC 9 hours
                (7, base_date + timedelta(days=6), 120),  # Bathroom heater 2 hours
            ]
            
            for device_id, started_at, duration in consumption_data:
                # Get device wattage
                cursor = await db.execute("SELECT wattage FROM devices WHERE id = ?", (device_id,))
                device = await cursor.fetchone()
                kwh = (device["wattage"] * duration) / 60 / 1000
                
                await db.execute(
                    "INSERT INTO consumption_logs (device_id, started_at, duration_minutes, kwh) VALUES (?, ?, ?, ?)",
                    (device_id, started_at.isoformat(), duration, kwh)
                )
            
            # Seed a schedule example
            schedules = [
                (1, 1, "14:00", "17:00", 1),  # AC on Tuesday 2-5pm
                (4, 0, "09:00", "17:00", 1),  # PC Monday 9am-5pm
                (4, 2, "09:00", "17:00", 1),  # PC Wednesday 9am-5pm
            ]
            
            for device_id, dow, start, end, enabled in schedules:
                await db.execute(
                    "INSERT INTO schedules (device_id, day_of_week, start_time, end_time, enabled) VALUES (?, ?, ?, ?, ?)",
                    (device_id, dow, start, end, enabled)
                )
            
            # Seed current month budget
            current_month = datetime.now().strftime("%Y-%m")
            await db.execute(
                "INSERT INTO budgets (year_month, budget_kwh, price_per_kwh, alert_threshold_percent) VALUES (?, ?, ?, ?)",
                (current_month, 300.0, 0.15, 80)
            )
            
            await db.commit()
            print("Database seeded with initial data")
    finally:
        await db.close()
