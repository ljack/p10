"""Tests for Pet endpoints - TDD Red Phase."""
import pytest
from fastapi.testclient import TestClient


class TestPetCreation:
    """Test creating pets."""
    
    def test_create_pet_with_valid_data(self, client):
        """Should create a pet with all required fields."""
        pet_data = {
            "name": "Buddy",
            "species": "dog",
            "breed": "Golden Retriever",
            "age_years": 3.5,
            "owner_name": "John Doe",
            "owner_phone": "555-1234",
            "notes": "Friendly dog"
        }
        response = client.post("/api/pets", json=pet_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Buddy"
        assert data["species"] == "dog"
        assert data["breed"] == "Golden Retriever"
        assert data["age_years"] == 3.5
        assert data["owner_name"] == "John Doe"
        assert data["owner_phone"] == "555-1234"
        assert data["notes"] == "Friendly dog"
        assert "id" in data
        assert data["id"] > 0
    
    def test_create_pet_without_optional_fields(self, client):
        """Should create a pet without optional fields (breed, notes)."""
        pet_data = {
            "name": "Whiskers",
            "species": "cat",
            "age_years": 2.0,
            "owner_name": "Jane Smith",
            "owner_phone": "555-5678"
        }
        response = client.post("/api/pets", json=pet_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Whiskers"
        assert data["species"] == "cat"
        assert data.get("breed") is None or data.get("breed") == ""
        assert data.get("notes") is None or data.get("notes") == ""
    
    def test_create_pet_missing_required_field(self, client):
        """Should return 422 when required field is missing."""
        pet_data = {
            "name": "Buddy",
            "species": "dog",
            # missing age_years
            "owner_name": "John Doe",
            "owner_phone": "555-1234"
        }
        response = client.post("/api/pets", json=pet_data)
        assert response.status_code == 422
    
    def test_create_pet_invalid_species(self, client):
        """Should return 422 for invalid species."""
        pet_data = {
            "name": "Buddy",
            "species": "dragon",  # invalid
            "age_years": 3.5,
            "owner_name": "John Doe",
            "owner_phone": "555-1234"
        }
        response = client.post("/api/pets", json=pet_data)
        assert response.status_code == 422


class TestPetRetrieval:
    """Test retrieving pets."""
    
    def test_get_all_pets_empty(self, client):
        """Should return empty list when no pets exist."""
        response = client.get("/api/pets")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_all_pets(self, client):
        """Should return all pets."""
        # Create two pets
        pet1 = {"name": "Buddy", "species": "dog", "age_years": 3.5, 
                "owner_name": "John Doe", "owner_phone": "555-1234"}
        pet2 = {"name": "Whiskers", "species": "cat", "age_years": 2.0,
                "owner_name": "Jane Smith", "owner_phone": "555-5678"}
        
        client.post("/api/pets", json=pet1)
        client.post("/api/pets", json=pet2)
        
        response = client.get("/api/pets")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Buddy"
        assert data[1]["name"] == "Whiskers"
    
    def test_get_pet_by_id(self, client):
        """Should return a specific pet by ID."""
        pet_data = {"name": "Buddy", "species": "dog", "age_years": 3.5,
                   "owner_name": "John Doe", "owner_phone": "555-1234"}
        create_response = client.post("/api/pets", json=pet_data)
        pet_id = create_response.json()["id"]
        
        response = client.get(f"/api/pets/{pet_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == pet_id
        assert data["name"] == "Buddy"
    
    def test_get_pet_not_found(self, client):
        """Should return 404 for non-existent pet."""
        response = client.get("/api/pets/999")
        assert response.status_code == 404
    
    def test_search_pets_by_owner_name(self, client):
        """Should filter pets by owner name."""
        pet1 = {"name": "Buddy", "species": "dog", "age_years": 3.5,
                "owner_name": "John Doe", "owner_phone": "555-1234"}
        pet2 = {"name": "Whiskers", "species": "cat", "age_years": 2.0,
                "owner_name": "Jane Smith", "owner_phone": "555-5678"}
        
        client.post("/api/pets", json=pet1)
        client.post("/api/pets", json=pet2)
        
        response = client.get("/api/pets?owner_name=John")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["owner_name"] == "John Doe"


class TestPetUpdate:
    """Test updating pets."""
    
    def test_update_pet(self, client):
        """Should update a pet's information."""
        pet_data = {"name": "Buddy", "species": "dog", "age_years": 3.5,
                   "owner_name": "John Doe", "owner_phone": "555-1234"}
        create_response = client.post("/api/pets", json=pet_data)
        pet_id = create_response.json()["id"]
        
        update_data = {"name": "Buddy Jr.", "species": "dog", "age_years": 4.0,
                      "owner_name": "John Doe", "owner_phone": "555-1234"}
        response = client.put(f"/api/pets/{pet_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Buddy Jr."
        assert data["age_years"] == 4.0
    
    def test_update_pet_not_found(self, client):
        """Should return 404 when updating non-existent pet."""
        update_data = {"name": "Ghost", "species": "dog", "age_years": 1.0,
                      "owner_name": "Nobody", "owner_phone": "555-0000"}
        response = client.put("/api/pets/999", json=update_data)
        assert response.status_code == 404


class TestPetDeletion:
    """Test deleting pets."""
    
    def test_delete_pet(self, client):
        """Should delete a pet."""
        pet_data = {"name": "Buddy", "species": "dog", "age_years": 3.5,
                   "owner_name": "John Doe", "owner_phone": "555-1234"}
        create_response = client.post("/api/pets", json=pet_data)
        pet_id = create_response.json()["id"]
        
        response = client.delete(f"/api/pets/{pet_id}")
        assert response.status_code == 204
        
        # Verify it's deleted
        get_response = client.get(f"/api/pets/{pet_id}")
        assert get_response.status_code == 404
    
    def test_delete_pet_not_found(self, client):
        """Should return 404 when deleting non-existent pet."""
        response = client.delete("/api/pets/999")
        assert response.status_code == 404
