import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "electricity.db")

async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db

async def init_db():
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('lighting','heating','cooling','appliance','electronics','other')),
                wattage INTEGER NOT NULL,
                location TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS consumption_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                started_at TIMESTAMP NOT NULL,
                duration_minutes INTEGER NOT NULL,
                kwh REAL NOT NULL,
                recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id)
            );

            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT 1,
                FOREIGN KEY (device_id) REFERENCES devices(id)
            );

            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                year_month TEXT NOT NULL UNIQUE,
                budget_kwh REAL NOT NULL,
                price_per_kwh REAL NOT NULL,
                alert_threshold_percent INTEGER NOT NULL DEFAULT 80
            );
        """)
        await db.commit()
    finally:
        await db.close()

async def seed_db():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM devices")
        row = await cursor.fetchone()
        if row[0] > 0:
            return

        devices = [
            ("Living Room AC", "cooling", 1500, "Living Room"),
            ("Kitchen Oven", "appliance", 2000, "Kitchen"),
            ("Bedroom Lamp", "lighting", 60, "Bedroom"),
            ("Office Computer", "electronics", 300, "Office"),
            ("Bathroom Heater", "heating", 1000, "Bathroom"),
            ("Living Room TV", "electronics", 150, "Living Room"),
            ("Kitchen Fridge", "appliance", 200, "Kitchen"),
            ("Garage Light", "lighting", 100, "Garage"),
        ]

        for name, dtype, wattage, location in devices:
            await db.execute(
                "INSERT INTO devices (name, type, wattage, location) VALUES (?, ?, ?, ?)",
                (name, dtype, wattage, location),
            )

        import datetime
        today = datetime.date.today()
        consumption_entries = []
        for day_offset in range(30):
            d = today - datetime.timedelta(days=day_offset)
            date_str = d.isoformat()
            entries = [
                (1, f"{date_str} 14:00:00", 120, 1500),
                (2, f"{date_str} 18:00:00", 60, 2000),
                (3, f"{date_str} 19:00:00", 300, 60),
                (4, f"{date_str} 09:00:00", 480, 300),
                (5, f"{date_str} 07:00:00", 60, 1000),
                (6, f"{date_str} 20:00:00", 180, 150),
                (7, f"{date_str} 00:00:00", 1440, 200),
            ]
            for device_id, started_at, duration, wattage in entries:
                kwh = wattage * duration / 60 / 1000
                consumption_entries.append((device_id, started_at, duration, kwh))

        await db.executemany(
            "INSERT INTO consumption_logs (device_id, started_at, duration_minutes, kwh) VALUES (?, ?, ?, ?)",
            consumption_entries,
        )

        current_month = today.strftime("%Y-%m")
        await db.execute(
            "INSERT INTO budgets (year_month, budget_kwh, price_per_kwh, alert_threshold_percent) VALUES (?, ?, ?, ?)",
            (current_month, 500.0, 0.15, 80),
        )

        schedules = [
            (1, 0, "14:00", "16:00", 1),
            (1, 2, "14:00", "16:00", 1),
            (1, 4, "14:00", "16:00", 1),
            (2, 0, "18:00", "19:00", 1),
            (2, 1, "18:00", "19:00", 1),
            (2, 2, "18:00", "19:00", 1),
            (2, 3, "18:00", "19:00", 1),
            (2, 4, "18:00", "19:00", 1),
            (3, 0, "19:00", "23:00", 1),
            (3, 1, "19:00", "23:00", 1),
            (3, 2, "19:00", "23:00", 1),
            (3, 3, "19:00", "23:00", 1),
            (3, 4, "19:00", "23:00", 1),
            (3, 5, "19:00", "23:00", 1),
            (3, 6, "19:00", "23:00", 1),
            (4, 0, "09:00", "17:00", 1),
            (4, 1, "09:00", "17:00", 1),
            (4, 2, "09:00", "17:00", 1),
            (4, 3, "09:00", "17:00", 1),
            (4, 4, "09:00", "17:00", 1),
            (5, 0, "07:00", "08:00", 1),
            (5, 1, "07:00", "08:00", 1),
            (5, 2, "07:00", "08:00", 1),
            (5, 3, "07:00", "08:00", 1),
            (5, 4, "07:00", "08:00", 1),
        ]

        await db.executemany(
            "INSERT INTO schedules (device_id, day_of_week, start_time, end_time, enabled) VALUES (?, ?, ?, ?, ?)",
            schedules,
        )

        await db.commit()
    finally:
        await db.close()
