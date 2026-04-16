"""Treatment Pydantic schemas for validation."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class TreatmentBase(BaseModel):
    """Base treatment schema with common fields."""
    name: str = Field(..., min_length=1)
    duration_minutes: int = Field(..., gt=0)
    description: Optional[str] = None
    price: float = Field(..., ge=0)


class TreatmentCreate(TreatmentBase):
    """Schema for creating a treatment."""
    pass


class TreatmentUpdate(TreatmentBase):
    """Schema for updating a treatment."""
    pass


class TreatmentResponse(TreatmentBase):
    """Schema for treatment response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
