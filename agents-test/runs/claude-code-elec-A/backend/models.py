import sqlalchemy
from database import metadata

devices = sqlalchemy.Table(
    "devices",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("name", sqlalchemy.String, nullable=False),
    sqlalchemy.Column("type", sqlalchemy.String, nullable=False),
    sqlalchemy.Column("wattage", sqlalchemy.Integer, nullable=False),
    sqlalchemy.Column("location", sqlalchemy.String, nullable=False),
    sqlalchemy.Column("is_active", sqlalchemy.Boolean, default=True, server_default="1"),
    sqlalchemy.Column(
        "created_at",
        sqlalchemy.DateTime,
        server_default=sqlalchemy.func.now(),
    ),
)

consumption_logs = sqlalchemy.Table(
    "consumption_logs",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column(
        "device_id",
        sqlalchemy.Integer,
        sqlalchemy.ForeignKey("devices.id"),
        nullable=False,
    ),
    sqlalchemy.Column("started_at", sqlalchemy.DateTime, nullable=False),
    sqlalchemy.Column("duration_minutes", sqlalchemy.Integer, nullable=False),
    sqlalchemy.Column("kwh", sqlalchemy.Float, nullable=False),
    sqlalchemy.Column(
        "recorded_at",
        sqlalchemy.DateTime,
        server_default=sqlalchemy.func.now(),
    ),
)

schedules = sqlalchemy.Table(
    "schedules",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column(
        "device_id",
        sqlalchemy.Integer,
        sqlalchemy.ForeignKey("devices.id"),
        nullable=False,
    ),
    sqlalchemy.Column("day_of_week", sqlalchemy.Integer, nullable=False),
    sqlalchemy.Column("start_time", sqlalchemy.String, nullable=False),
    sqlalchemy.Column("end_time", sqlalchemy.String, nullable=False),
    sqlalchemy.Column("enabled", sqlalchemy.Boolean, default=True, server_default="1"),
)

budgets = sqlalchemy.Table(
    "budgets",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("year_month", sqlalchemy.String, nullable=False, unique=True),
    sqlalchemy.Column("budget_kwh", sqlalchemy.Float, nullable=False),
    sqlalchemy.Column("price_per_kwh", sqlalchemy.Float, nullable=False),
    sqlalchemy.Column(
        "alert_threshold_percent",
        sqlalchemy.Integer,
        default=80,
        server_default="80",
    ),
)
