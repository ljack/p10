"""Tests for device endpoints."""
import pytest


class TestDeviceCreation:
    """Tests for POST /api/devices."""
    
    async def test_create_device_success(self, client):
        """Test creating a device with valid data."""
        device_data = {
            "name": "Living Room AC",
            "type": "cooling",
            "wattage": 1500,
            "location": "Living Room"
        }
        
        response = await client.post("/api/devices", json=device_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Living Room AC"
        assert data["type"] == "cooling"
        assert data["wattage"] == 1500
        assert data["location"] == "Living Room"
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data
    
    async def test_create_device_missing_required_field(self, client):
        """Test creating a device without required field fails."""
        device_data = {
            "name": "Kitchen Oven",
            "type": "appliance",
            # missing wattage
            "location": "Kitchen"
        }
        
        response = await client.post("/api/devices", json=device_data)
        
        assert response.status_code == 422
    
    async def test_create_device_invalid_type(self, client):
        """Test creating a device with invalid type fails."""
        device_data = {
            "name": "Test Device",
            "type": "invalid_type",
            "wattage": 1000,
            "location": "Test Location"
        }
        
        response = await client.post("/api/devices", json=device_data)
        
        assert response.status_code == 422


class TestDeviceList:
    """Tests for GET /api/devices."""
    
    async def test_list_devices_empty(self, client):
        """Test listing devices when none exist."""
        response = await client.get("/api/devices")
        
        assert response.status_code == 200
        data = response.json()
        assert data == []
    
    async def test_list_devices_with_data(self, client, sample_devices):
        """Test listing devices returns all devices."""
        response = await client.get("/api/devices")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
        assert all("id" in device for device in data)
    
    async def test_filter_devices_by_type(self, client, sample_devices):
        """Test filtering devices by type."""
        response = await client.get("/api/devices?type=cooling")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["type"] == "cooling"
    
    async def test_filter_devices_by_location(self, client, sample_devices):
        """Test filtering devices by location."""
        response = await client.get("/api/devices?location=Living Room")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(device["location"] == "Living Room" for device in data)


class TestDeviceDetail:
    """Tests for GET /api/devices/{id}."""
    
    async def test_get_device_success(self, client, sample_device):
        """Test getting a device by ID."""
        device_id = sample_device["id"]
        
        response = await client.get(f"/api/devices/{device_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == device_id
        assert data["name"] == sample_device["name"]
    
    async def test_get_device_not_found(self, client):
        """Test getting a non-existent device returns 404."""
        response = await client.get("/api/devices/999")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


class TestDeviceUpdate:
    """Tests for PUT /api/devices/{id}."""
    
    async def test_update_device_success(self, client, sample_device):
        """Test updating a device."""
        device_id = sample_device["id"]
        update_data = {
            "name": "Updated AC Name",
            "type": "cooling",
            "wattage": 1800,
            "location": "Master Bedroom"
        }
        
        response = await client.put(f"/api/devices/{device_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated AC Name"
        assert data["wattage"] == 1800
        assert data["location"] == "Master Bedroom"
    
    async def test_update_device_not_found(self, client):
        """Test updating a non-existent device returns 404."""
        update_data = {
            "name": "Test",
            "type": "cooling",
            "wattage": 1000,
            "location": "Test"
        }
        
        response = await client.put("/api/devices/999", json=update_data)
        
        assert response.status_code == 404


class TestDeviceDelete:
    """Tests for DELETE /api/devices/{id}."""
    
    async def test_delete_device_success(self, client, sample_device):
        """Test soft-deleting a device."""
        device_id = sample_device["id"]
        
        response = await client.delete(f"/api/devices/{device_id}")
        
        assert response.status_code == 200
        
        # Verify device is soft-deleted (is_active = false)
        get_response = await client.get(f"/api/devices/{device_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["is_active"] is False
    
    async def test_delete_device_not_found(self, client):
        """Test deleting a non-existent device returns 404."""
        response = await client.delete("/api/devices/999")
        
        assert response.status_code == 404
    
    async def test_list_excludes_inactive_devices(self, client, sample_device):
        """Test that listing devices excludes soft-deleted devices by default."""
        device_id = sample_device["id"]
        
        # Delete the device
        await client.delete(f"/api/devices/{device_id}")
        
        # List devices
        response = await client.get("/api/devices")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
