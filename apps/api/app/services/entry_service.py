from uuid import UUID

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
        raise NotImplementedError

    async def update(self, entry_id: UUID, user_id: UUID, data: EntryUpdate) -> EntryResponse:
        raise NotImplementedError

    async def delete(self, entry_id: UUID, user_id: UUID) -> None:
        raise NotImplementedError
