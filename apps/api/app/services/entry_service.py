from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import EntryCreate, EntryResponse, EntryUpdate


class EntryService:
    def __init__(self, entry_repo: EntryRepository) -> None:
        self.entry_repo = entry_repo

    async def get_all(self, user_id: UUID) -> list[EntryResponse]:
        raise NotImplementedError

    async def get_by_id(self, entry_id: UUID, user_id: UUID) -> EntryResponse:
        raise NotImplementedError

    async def create(self, user_id: UUID, data: EntryCreate) -> EntryResponse:
        try:
            entry = await self.entry_repo.create(user_id, data)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya tienes esta entrada en tu colección",
            )
        return EntryResponse.model_validate(entry)

    async def update(self, entry_id: UUID, user_id: UUID, data: EntryUpdate) -> EntryResponse:
        raise NotImplementedError

    async def delete(self, entry_id: UUID, user_id: UUID) -> None:
        raise NotImplementedError
