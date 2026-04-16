import os
from pathlib import Path

import databases
import sqlalchemy

DATABASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{DATABASE_DIR / 'electricity.db'}"

database = databases.Database(DATABASE_URL)

metadata = sqlalchemy.MetaData()

engine = sqlalchemy.create_engine(
    DATABASE_URL.replace("sqlite:///", "sqlite:///"),
    connect_args={"check_same_thread": False},
)


def create_tables():
    """Create all tables defined in metadata."""
    metadata.create_all(engine)
