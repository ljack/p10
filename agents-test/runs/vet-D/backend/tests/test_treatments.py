"""Tests for Treatment endpoints - TDD Red Phase."""
import pytest
from fastapi.testclient import TestClient


class TestTreatmentCreation:
    """Test creating treatments."""
    
    def test_create_treatment_with_valid_data(self, client):
        """Should create a treatment with all fields."""
        treatment_data = {
            "name": "Vaccination",
            "duration_minutes": 30,
            "description": "Annual vaccination",
            "price": 75.00
        }
        response = client.post("/api/treatments", json=treatment_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Vaccination"
        assert data["duration_minutes"] == 30
        assert data["description"] == "Annual vaccination"
        assert data["price"] == 75.00
        assert "id" in data
        assert data["id"] > 0
    
    def test_create_treatment_without_description(self, client):
        """Should create a treatment without optional description."""
        treatment_data = {
            "name": "X-ray",
            "duration_minutes": 45,
            "price": 150.00
        }
        response = client.post("/api/treatments", json=treatment_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "X-ray"
        assert data.get("description") is None or data.get("description") == ""
    
    def test_create_treatment_missing_required_field(self, client):
        """Should return 422 when required field is missing."""
        treatment_data = {
            "name": "Checkup",
            # missing duration_minutes and price
        }
        response = client.post("/api/treatments", json=treatment_data)
        assert response.status_code == 422
    
    def test_create_treatment_negative_price(self, client):
        """Should return 422 for negative price."""
        treatment_data = {
            "name": "Free Service",
            "duration_minutes": 15,
            "price": -10.00
        }
        response = client.post("/api/treatments", json=treatment_data)
        assert response.status_code == 422
    
    def test_create_treatment_zero_duration(self, client):
        """Should return 422 for zero or negative duration."""
        treatment_data = {
            "name": "Instant Service",
            "duration_minutes": 0,
            "price": 50.00
        }
        response = client.post("/api/treatments", json=treatment_data)
        assert response.status_code == 422


class TestTreatmentRetrieval:
    """Test retrieving treatments."""
    
    def test_get_all_treatments_empty(self, client):
        """Should return empty list when no treatments exist."""
        response = client.get("/api/treatments")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_all_treatments(self, client):
        """Should return all treatments."""
        treatment1 = {"name": "Vaccination", "duration_minutes": 30, "price": 75.00}
        treatment2 = {"name": "Dental cleaning", "duration_minutes": 60, "price": 200.00}
        
        client.post("/api/treatments", json=treatment1)
        client.post("/api/treatments", json=treatment2)
        
        response = client.get("/api/treatments")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Vaccination"
        assert data[1]["name"] == "Dental cleaning"


class TestTreatmentUpdate:
    """Test updating treatments."""
    
    def test_update_treatment(self, client):
        """Should update a treatment's information."""
        treatment_data = {"name": "Vaccination", "duration_minutes": 30, "price": 75.00}
        create_response = client.post("/api/treatments", json=treatment_data)
        treatment_id = create_response.json()["id"]
        
        update_data = {"name": "Premium Vaccination", "duration_minutes": 45, "price": 100.00}
        response = client.put(f"/api/treatments/{treatment_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Premium Vaccination"
        assert data["duration_minutes"] == 45
        assert data["price"] == 100.00
    
    def test_update_treatment_not_found(self, client):
        """Should return 404 when updating non-existent treatment."""
        update_data = {"name": "Ghost", "duration_minutes": 1, "price": 1.00}
        response = client.put("/api/treatments/999", json=update_data)
        assert response.status_code == 404


class TestTreatmentDeletion:
    """Test deleting treatments."""
    
    def test_delete_treatment(self, client):
        """Should delete a treatment."""
        treatment_data = {"name": "Vaccination", "duration_minutes": 30, "price": 75.00}
        create_response = client.post("/api/treatments", json=treatment_data)
        treatment_id = create_response.json()["id"]
        
        response = client.delete(f"/api/treatments/{treatment_id}")
        assert response.status_code == 204
        
        # Verify it's deleted by checking list
        get_response = client.get("/api/treatments")
        assert len(get_response.json()) == 0
    
    def test_delete_treatment_not_found(self, client):
        """Should return 404 when deleting non-existent treatment."""
        response = client.delete("/api/treatments/999")
        assert response.status_code == 404
