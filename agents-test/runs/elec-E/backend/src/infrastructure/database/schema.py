"""Database schema initialization."""

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    wattage INTEGER NOT NULL,
    location TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumption_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    started_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL,
    kwh REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_month TEXT NOT NULL UNIQUE,
    budget_kwh REAL NOT NULL,
    price_per_kwh REAL NOT NULL,
    alert_threshold_percent INTEGER DEFAULT 80
);

CREATE INDEX IF NOT EXISTS idx_consumption_device ON consumption_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_consumption_started ON consumption_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_schedules_device ON schedules(device_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON schedules(day_of_week);
"""


async def initialize_database(connection) -> None:
    """Initialize database schema.
    
    Args:
        connection: Database connection
    """
    await connection.executescript(CREATE_TABLES_SQL)
    await connection.commit()
