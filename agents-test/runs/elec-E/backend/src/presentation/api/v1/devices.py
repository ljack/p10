"""Device API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request
from presentation.schemas.device_schemas import (
    DeviceCreate, DeviceUpdate, DeviceResponse, ConsumptionCreate, ConsumptionResponse
)
from application.mediator import Mediator
from application.commands.device_commands import (
    CreateDeviceCommand, UpdateDeviceCommand, DeleteDeviceCommand, CreateConsumptionCommand
)
from application.queries.device_queries import GetDeviceQuery, ListDevicesQuery

router = APIRouter(prefix="/api/v1/devices", tags=["devices"])


def get_mediator(request: Request) -> Mediator:
    """Get mediator from app state.
    
    Args:
        request: FastAPI request
        
    Returns:
        Mediator instance
    """
    return request.app.state.mediator


@router.post("", response_model=DeviceResponse, status_code=201)
async def create_device(
    device: DeviceCreate, mediator: Mediator = Depends(get_mediator)
) -> DeviceResponse:
    """Create a new device.
    
    Args:
        device: Device data
        mediator: Command mediator
        
    Returns:
        Created device
    """
    command = CreateDeviceCommand(
        name=device.name, type=device.type, wattage=device.wattage, location=device.location
    )
    result = await mediator.send(command)
    
    return DeviceResponse(
        id=result.id,
        name=result.name,
        type=result.type,
        wattage=result.wattage,
        location=result.location,
        is_active=result.is_active,
        created_at=result.created_at,
        _links={
            "self": f"/api/v1/devices/{result.id}",
            "consumption": f"/api/v1/devices/{result.id}/consumption"
        }
    )


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: int, mediator: Mediator = Depends(get_mediator)
) -> DeviceResponse:
    """Get device by ID.
    
    Args:
        device_id: Device ID
        mediator: Query mediator
        
    Returns:
        Device data
    """
    query = GetDeviceQuery(device_id=device_id)
    result = await mediator.send(query)
    
    return DeviceResponse(
        id=result.id,
        name=result.name,
        type=result.type,
        wattage=result.wattage,
        location=result.location,
        is_active=result.is_active,
        created_at=result.created_at,
        _links={
            "self": f"/api/v1/devices/{result.id}",
            "consumption": f"/api/v1/devices/{result.id}/consumption"
        }
    )


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int, device: DeviceUpdate, mediator: Mediator = Depends(get_mediator)
) -> DeviceResponse:
    """Update device.
    
    Args:
        device_id: Device ID
        device: Updated data
        mediator: Command mediator
        
    Returns:
        Updated device
    """
    command = UpdateDeviceCommand(device_id=device_id, name=device.name, location=device.location)
    result = await mediator.send(command)
    
    return DeviceResponse(**result.__dict__, _links={"self": f"/api/v1/devices/{device_id}"})


@router.delete("/{device_id}", status_code=204)
async def delete_device(
    device_id: int, mediator: Mediator = Depends(get_mediator)
) -> None:
    """Delete (deactivate) device.
    
    Args:
        device_id: Device ID
        mediator: Command mediator
    """
    command = DeleteDeviceCommand(device_id=device_id)
    await mediator.send(command)
