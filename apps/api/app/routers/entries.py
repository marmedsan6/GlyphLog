from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_entry_service
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.entry import EntryCreate, EntryResponse, EntryUpdate
from app.services.entry_service import EntryService

router = APIRouter()


@router.get("/", response_model=list[EntryResponse])
async def list_entries(
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> list[EntryResponse]:
    return await service.get_all(user_id=current_user.id)


@router.post("/", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    data: EntryCreate,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.create(user_id=current_user.id, data=data)


@router.get("/{entry_id}", response_model=EntryResponse)
async def get_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.get_by_id(entry_id=entry_id, user_id=current_user.id)


@router.patch("/{entry_id}", response_model=EntryResponse)
async def update_entry(
    entry_id: UUID,
    data: EntryUpdate,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.update(entry_id=entry_id, user_id=current_user.id, data=data)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> None:
    await service.delete(entry_id=entry_id, user_id=current_user.id)
