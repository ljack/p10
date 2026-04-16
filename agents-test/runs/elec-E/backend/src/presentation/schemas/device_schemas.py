"""Pydantic schemas for device API."""
from pydantic import BaseModel, Field
from datetime import datetime


class DeviceCreate(BaseModel):
    """Schema for device creation."""
    
    name: str = Field(..., example="Living room AC")
    type: str = Field(..., example="cooling")
    wattage: int = Field(..., gt=0, example=1500)
    location: str = Field(..., example="Living room")


class DeviceUpdate(BaseModel):
    """Schema for device update."""
    
    name: str = Field(..., example="Living room AC")
    location: str = Field(..., example="Living room")


class DeviceResponse(BaseModel):
    """Schema for device response."""
    
    id: int
    name: str
    type: str
    wattage: int
    location: str
    is_active: bool
    created_at: datetime
    _links: dict = {}
    
    class Config:
        """Pydantic config."""
        from_attributes = True


class ConsumptionCreate(BaseModel):
    """Schema for consumption creation."""
    
    device_id: int = Field(..., example=1)
    started_at: datetime
    duration_minutes: int = Field(..., gt=0, example=120)


class ConsumptionResponse(BaseModel):
    """Schema for consumption response."""
    
    id: int
    device_id: int
    started_at: datetime
    duration_minutes: int
    kwh: float
    recorded_at: datetime
    _links: dict = {}


class ErrorResponse(BaseModel):
    """Schema for error responses."""
    
    code: int
    message: str
    details: dict
    timestamp: str
    trace_id: str
    suggestion: str
