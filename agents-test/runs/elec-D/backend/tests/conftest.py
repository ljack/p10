"""Test fixtures for the application."""
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from httpx import AsyncClient
from app.database import Base, get_database
from app.main import app


@pytest.fixture
def test_db_url():
    """Return test database URL."""
    return "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_engine(test_db_url):
    """Create test database engine."""
    # Use synchronous engine for table creation
    sync_url = test_db_url.replace("+aiosqlite", "")
    engine = create_engine(
        sync_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Clean up
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
async def db(test_db_url, db_engine):
    """Create test database connection."""
    from databases import Database
    
    database = Database(test_db_url)
    await database.connect()
    
    yield database
    
    await database.disconnect()


@pytest.fixture
async def client(db, test_db_url):
    """Create test client with dependency override."""
    from databases import Database
    from httpx import ASGITransport
    
    # Override the database dependency
    test_database = Database(test_db_url)
    await test_database.connect()
    
    async def override_get_database():
        return test_database
    
    app.dependency_overrides[get_database] = override_get_database
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    await test_database.disconnect()
    app.dependency_overrides.clear()


@pytest.fixture
async def sample_device(client):
    """Create a sample device for testing."""
    device_data = {
        "name": "Living Room AC",
        "type": "cooling",
        "wattage": 1500,
        "location": "Living Room"
    }
    response = await client.post("/api/devices", json=device_data)
    assert response.status_code == 201
    return response.json()


@pytest.fixture
async def sample_devices(client):
    """Create multiple sample devices for testing."""
    devices_data = [
        {"name": "Living Room AC", "type": "cooling", "wattage": 1500, "location": "Living Room"},
        {"name": "Kitchen Oven", "type": "appliance", "wattage": 2400, "location": "Kitchen"},
        {"name": "Bedroom Light", "type": "lighting", "wattage": 60, "location": "Bedroom"},
        {"name": "Office Heater", "type": "heating", "wattage": 2000, "location": "Office"},
        {"name": "TV", "type": "electronics", "wattage": 150, "location": "Living Room"},
    ]
    
    devices = []
    for device_data in devices_data:
        response = await client.post("/api/devices", json=device_data)
        assert response.status_code == 201
        devices.append(response.json())
    
    return devices
