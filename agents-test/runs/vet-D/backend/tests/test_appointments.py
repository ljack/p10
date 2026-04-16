"""Tests for Appointment endpoints - TDD Red Phase."""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient


@pytest.fixture
def sample_pet(client):
    """Create a sample pet for testing."""
    pet_data = {
        "name": "Buddy",
        "species": "dog",
        "age_years": 3.5,
        "owner_name": "John Doe",
        "owner_phone": "555-1234"
    }
    response = client.post("/api/pets", json=pet_data)
    return response.json()


@pytest.fixture
def sample_treatment(client):
    """Create a sample treatment for testing."""
    treatment_data = {
        "name": "Vaccination",
        "duration_minutes": 30,
        "price": 75.00
    }
    response = client.post("/api/treatments", json=treatment_data)
    return response.json()


class TestAppointmentCreation:
    """Test creating appointments."""
    
    def test_create_appointment_with_valid_data(self, client, sample_pet, sample_treatment):
        """Should create an appointment with all required fields."""
        # Schedule for tomorrow at 10:00 AM (Monday-Friday)
        tomorrow = datetime.now() + timedelta(days=1)
        # Find next weekday if tomorrow is weekend
        while tomorrow.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
            tomorrow += timedelta(days=1)
        
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled",
            "notes": "First visit"
        }
        response = client.post("/api/appointments", json=appointment_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["pet_id"] == sample_pet["id"]
        assert data["treatment_id"] == sample_treatment["id"]
        assert data["status"] == "scheduled"
        assert data["notes"] == "First visit"
        assert "id" in data
        assert "created_at" in data
    
    def test_create_appointment_without_notes(self, client, sample_pet, sample_treatment):
        """Should create an appointment without optional notes."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=11, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        response = client.post("/api/appointments", json=appointment_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data.get("notes") is None or data.get("notes") == ""
    
    def test_create_appointment_invalid_pet(self, client, sample_treatment):
        """Should return 422 for non-existent pet."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": 99999,
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        response = client.post("/api/appointments", json=appointment_data)
        assert response.status_code == 422
    
    def test_create_appointment_invalid_treatment(self, client, sample_pet):
        """Should return 422 for non-existent treatment."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": 99999,
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        response = client.post("/api/appointments", json=appointment_data)
        assert response.status_code == 422
    
    def test_create_appointment_outside_clinic_hours(self, client, sample_pet, sample_treatment):
        """Should return 422 for appointment outside clinic hours (8:00-17:00)."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=18, minute=0, second=0, microsecond=0)  # 6 PM
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        response = client.post("/api/appointments", json=appointment_data)
        assert response.status_code == 422
        assert "clinic hours" in response.json()["detail"].lower()
    
    def test_create_appointment_on_weekend(self, client, sample_pet, sample_treatment):
        """Should return 422 for appointment on weekend."""
        # Find next Saturday
        today = datetime.now()
        days_until_saturday = (5 - today.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        saturday = today + timedelta(days=days_until_saturday)
        scheduled_time = saturday.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        response = client.post("/api/appointments", json=appointment_data)
        assert response.status_code == 422
        assert "weekend" in response.json()["detail"].lower() or "monday-friday" in response.json()["detail"].lower()
    
    def test_create_overlapping_appointment(self, client, sample_pet, sample_treatment):
        """Should return 422 for overlapping appointments."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        
        # Create first appointment
        response1 = client.post("/api/appointments", json=appointment_data)
        assert response1.status_code == 201
        
        # Try to create overlapping appointment
        response2 = client.post("/api/appointments", json=appointment_data)
        assert response2.status_code == 422
        assert "overlap" in response2.json()["detail"].lower()


class TestAppointmentRetrieval:
    """Test retrieving appointments."""
    
    def test_get_all_appointments_empty(self, client):
        """Should return empty list when no appointments exist."""
        response = client.get("/api/appointments")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_all_appointments(self, client, sample_pet, sample_treatment):
        """Should return all appointments."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        
        time1 = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)
        time2 = tomorrow.replace(hour=11, minute=0, second=0, microsecond=0)
        
        appt1 = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": time1.isoformat(),
            "status": "scheduled"
        }
        appt2 = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": time2.isoformat(),
            "status": "scheduled"
        }
        
        client.post("/api/appointments", json=appt1)
        client.post("/api/appointments", json=appt2)
        
        response = client.get("/api/appointments")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
    
    def test_get_appointment_by_id(self, client, sample_pet, sample_treatment):
        """Should return a specific appointment by ID."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        create_response = client.post("/api/appointments", json=appointment_data)
        appointment_id = create_response.json()["id"]
        
        response = client.get(f"/api/appointments/{appointment_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == appointment_id
    
    def test_get_appointment_not_found(self, client):
        """Should return 404 for non-existent appointment."""
        response = client.get("/api/appointments/999")
        assert response.status_code == 404
    
    def test_filter_appointments_by_date(self, client, sample_pet, sample_treatment):
        """Should filter appointments by date."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        day_after = tomorrow + timedelta(days=1)
        while day_after.weekday() >= 5:
            day_after += timedelta(days=1)
        
        time1 = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        time2 = day_after.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appt1 = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": time1.isoformat(),
            "status": "scheduled"
        }
        appt2 = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": time2.isoformat(),
            "status": "scheduled"
        }
        
        client.post("/api/appointments", json=appt1)
        client.post("/api/appointments", json=appt2)
        
        response = client.get(f"/api/appointments?date={tomorrow.date().isoformat()}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
    
    def test_filter_appointments_by_status(self, client, sample_pet, sample_treatment):
        """Should filter appointments by status."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        
        time1 = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)
        time2 = tomorrow.replace(hour=11, minute=0, second=0, microsecond=0)
        
        appt1 = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": time1.isoformat(),
            "status": "scheduled"
        }
        appt2 = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": time2.isoformat(),
            "status": "completed"
        }
        
        client.post("/api/appointments", json=appt1)
        client.post("/api/appointments", json=appt2)
        
        response = client.get("/api/appointments?status=scheduled")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "scheduled"


class TestAppointmentUpdate:
    """Test updating appointments."""
    
    def test_update_appointment_status(self, client, sample_pet, sample_treatment):
        """Should update appointment status."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        create_response = client.post("/api/appointments", json=appointment_data)
        appointment_id = create_response.json()["id"]
        
        update_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "completed"
        }
        response = client.put(f"/api/appointments/{appointment_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
    
    def test_update_appointment_reschedule(self, client, sample_pet, sample_treatment):
        """Should reschedule appointment to a new time."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        original_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        new_time = tomorrow.replace(hour=14, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": original_time.isoformat(),
            "status": "scheduled"
        }
        create_response = client.post("/api/appointments", json=appointment_data)
        appointment_id = create_response.json()["id"]
        
        update_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": new_time.isoformat(),
            "status": "scheduled"
        }
        response = client.put(f"/api/appointments/{appointment_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert new_time.isoformat() in data["scheduled_at"]
    
    def test_update_appointment_not_found(self, client, sample_pet, sample_treatment):
        """Should return 404 when updating non-existent appointment."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        update_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        response = client.put("/api/appointments/999", json=update_data)
        assert response.status_code == 404


class TestAppointmentDeletion:
    """Test deleting/canceling appointments."""
    
    def test_delete_appointment(self, client, sample_pet, sample_treatment):
        """Should delete/cancel an appointment."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        create_response = client.post("/api/appointments", json=appointment_data)
        appointment_id = create_response.json()["id"]
        
        response = client.delete(f"/api/appointments/{appointment_id}")
        assert response.status_code == 204
        
        # Verify it's deleted
        get_response = client.get(f"/api/appointments/{appointment_id}")
        assert get_response.status_code == 404
    
    def test_delete_appointment_not_found(self, client):
        """Should return 404 when deleting non-existent appointment."""
        response = client.delete("/api/appointments/999")
        assert response.status_code == 404


class TestAvailableSlots:
    """Test available time slots endpoint."""
    
    def test_get_available_slots_empty_day(self, client, sample_treatment):
        """Should return all available slots for an empty day."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        
        response = client.get(
            f"/api/appointments/available-slots?date={tomorrow.date().isoformat()}&treatment_id={sample_treatment['id']}"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Should have slots from 8:00 to 17:00 (accounting for 30-minute treatment)
        # Last slot should start at 16:30 or earlier
    
    def test_get_available_slots_with_existing_appointment(self, client, sample_pet, sample_treatment):
        """Should exclude occupied time slots."""
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        # Create an appointment
        appointment_data = {
            "pet_id": sample_pet["id"],
            "treatment_id": sample_treatment["id"],
            "scheduled_at": scheduled_time.isoformat(),
            "status": "scheduled"
        }
        client.post("/api/appointments", json=appointment_data)
        
        response = client.get(
            f"/api/appointments/available-slots?date={tomorrow.date().isoformat()}&treatment_id={sample_treatment['id']}"
        )
        assert response.status_code == 200
        data = response.json()
        
        # The 10:00 slot should not be available
        slot_times = [slot["time"] for slot in data]
        assert "10:00" not in slot_times
    
    def test_get_available_slots_weekend(self, client, sample_treatment):
        """Should return empty list for weekend."""
        today = datetime.now()
        days_until_saturday = (5 - today.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        saturday = today + timedelta(days=days_until_saturday)
        
        response = client.get(
            f"/api/appointments/available-slots?date={saturday.date().isoformat()}&treatment_id={sample_treatment['id']}"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
    
    def test_get_available_slots_missing_treatment_id(self, client):
        """Should return 422 when treatment_id is missing."""
        tomorrow = datetime.now() + timedelta(days=1)
        response = client.get(f"/api/appointments/available-slots?date={tomorrow.date().isoformat()}")
        assert response.status_code == 422
