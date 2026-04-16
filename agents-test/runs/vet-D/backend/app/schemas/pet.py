"""Pet Pydantic schemas for validation."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum


class SpeciesEnum(str, Enum):
    """Valid pet species."""
    dog = "dog"
    cat = "cat"
    bird = "bird"
    rabbit = "rabbit"
    other = "other"


class PetBase(BaseModel):
    """Base pet schema with common fields."""
    name: str = Field(..., min_length=1)
    species: SpeciesEnum
    breed: Optional[str] = None
    age_years: float = Field(..., gt=0)
    owner_name: str = Field(..., min_length=1)
    owner_phone: str = Field(..., min_length=1)
    notes: Optional[str] = None


class PetCreate(PetBase):
    """Schema for creating a pet."""
    pass


class PetUpdate(PetBase):
    """Schema for updating a pet."""
    pass


class PetResponse(PetBase):
    """Schema for pet response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
