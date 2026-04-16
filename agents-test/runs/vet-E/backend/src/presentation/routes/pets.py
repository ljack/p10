"""Pet API routes."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ...application.commands import CreatePetCommand, UpdatePetCommand, DeletePetCommand
from ...application.queries import GetPetQuery, ListPetsQuery
from ...application.handlers.pet_commands import CreatePetHandler, UpdatePetHandler, DeletePetHandler
from ...application.handlers.pet_queries import GetPetQueryHandler, ListPetsQueryHandler
from ..dtos import PetCreateRequest, PetUpdateRequest, PetResponse, HATEOASLink


router = APIRouter(prefix="/api/v1/pets", tags=["pets"])


def _build_pet_links(pet_id: int) -> list[HATEOASLink]:
    """Build HATEOAS links for pet.
    
    Args:
        pet_id: Pet ID
    Returns: List of links
    Raises: None
    """
    return [
        HATEOASLink(rel="self", href=f"/api/v1/pets/{pet_id}", method="GET"),
        HATEOASLink(rel="update", href=f"/api/v1/pets/{pet_id}", method="PUT"),
        HATEOASLink(rel="delete", href=f"/api/v1/pets/{pet_id}", method="DELETE"),
        HATEOASLink(rel="appointments", href=f"/api/v1/appointments?pet_id={pet_id}", method="GET"),
    ]


def _to_response(pet, with_links: bool = True) -> PetResponse:
    """Convert pet entity to response.
    
    Args:
        pet: Pet entity
        with_links: Include HATEOAS links
    Returns: Pet response
    Raises: None
    """
    return PetResponse(
        id=pet.id,
        name=pet.name,
        species=pet.species,
        age_years=pet.age_years,
        owner_name=pet.owner_name,
        owner_phone=pet.owner_phone,
        breed=pet.breed,
        notes=pet.notes,
        links=_build_pet_links(pet.id) if with_links else [],
    )


@router.post("/", response_model=PetResponse, status_code=201)
async def create_pet(
    request: PetCreateRequest,
    session: AsyncSession,
) -> PetResponse:
    """Create new pet.
    
    Args:
        request: Create request
        session: Database session
    Returns: Created pet
    Raises: DomainError
    """
    from ..dependencies import DependencyContainer
    container = DependencyContainer("sqlite+aiosqlite:///./vet.db")
    handler = CreatePetHandler(
        container.get_pet_repository(session),
        container.get_pet_factory(),
        container.get_uow(session),
    )
    command = CreatePetCommand(**request.model_dump())
    pet = await handler(command)
    return _to_response(pet)


@router.get("/", response_model=list[PetResponse])
async def list_pets(
    owner_name: str | None = Query(None),
    session: AsyncSession = None,
) -> list[PetResponse]:
    """List pets.
    
    Args:
        owner_name: Filter by owner name
        session: Database session
    Returns: List of pets
    Raises: None
    """
    from ..dependencies import DependencyContainer
    container = DependencyContainer("sqlite+aiosqlite:///./vet.db")
    handler = ListPetsQueryHandler(container.get_pet_repository(session))
    query = ListPetsQuery(owner_name=owner_name)
    pets = await handler(query)
    return [_to_response(p) for p in pets]


@router.get("/{id}", response_model=PetResponse)
async def get_pet(id: int, session: AsyncSession = None) -> PetResponse:
    \"\"\"Get pet by ID.
    
    Args:
        id: Pet ID
        session: Database session
    Returns: Pet
    Raises: EntityNotFoundError
    \"\"\"
    from ..dependencies import DependencyContainer
    container = DependencyContainer(\"sqlite+aiosqlite:///./vet.db\")
    handler = GetPetQueryHandler(container.get_pet_repository(session))
    query = GetPetQuery(id=id)
    pet = await handler(query)
    return _to_response(pet)


@router.put(\"/{id}\", response_model=PetResponse)
async def update_pet(
    id: int, request: PetUpdateRequest, session: AsyncSession = None
) -> PetResponse:
    \"\"\"Update pet.
    
    Args:
        id: Pet ID
        request: Update request
        session: Database session
    Returns: Updated pet
    Raises: EntityNotFoundError
    \"\"\"
    from ..dependencies import DependencyContainer
    container = DependencyContainer(\"sqlite+aiosqlite:///./vet.db\")
    handler = UpdatePetHandler(
        container.get_pet_repository(session), container.get_uow(session)
    )
    command = UpdatePetCommand(id=id, **request.model_dump(exclude_unset=True))
    pet = await handler(command)
    return _to_response(pet)


@router.delete(\"/{id}\", status_code=204)
async def delete_pet(id: int, session: AsyncSession = None) -> None:
    \"\"\"Delete pet.
    
    Args:
        id: Pet ID
        session: Database session
    Returns: None
    Raises: EntityNotFoundError
    \"\"\"
    from ..dependencies import DependencyContainer
    container = DependencyContainer(\"sqlite+aiosqlite:///./vet.db\")
    handler = DeletePetHandler(
        container.get_pet_repository(session), container.get_uow(session)
    )
    command = DeletePetCommand(id=id)
    await handler(command)
