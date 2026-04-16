"""Database configuration and connection."""
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from databases import Database

DATABASE_URL = "sqlite+aiosqlite:///./electricity.db"

# Database instance
database = Database(DATABASE_URL)

# SQLAlchemy metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)


async def get_database():
    """Dependency to get database connection."""
    return database


async def init_db():
    """Initialize database and create tables."""
    # Import models to register them
    from app import models  # noqa: F401
    
    # Create tables using sync engine
    sync_url = DATABASE_URL.replace("+aiosqlite", "")
    engine = create_engine(sync_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    engine.dispose()
    
    # Connect async database
    await database.connect()


async def close_db():
    """Close database connection."""
    await database.disconnect()
