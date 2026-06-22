from math import ceil
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError

from app.core.uploads import save_cover_image
from app.models.entry import EntryType
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import (
    EntryCreate,
    EntryListItem,
    EntryResponse,
    EntryUpdate,
    PaginatedEntryResponse,
)


class InvalidPaginationError(ValueError):
    """Raised when page or limit parameters are invalid."""


class EntryService:
    MIN_LIMIT = 1
    MAX_LIMIT = 100
    DEFAULT_LIMIT = 15

    def __init__(self, entry_repo: EntryRepository) -> None:
        self.entry_repo = entry_repo

    async def get_all(
        self,
        user_id: UUID,
        entry_type: EntryType | None = None,
        page: int = 1,
        limit: int = DEFAULT_LIMIT,
    ) -> PaginatedEntryResponse:
        if page < 1:
            raise InvalidPaginationError("page debe ser mayor o igual a 1")
        if not (self.MIN_LIMIT <= limit <= self.MAX_LIMIT):
            raise InvalidPaginationError(
                f"limit debe estar entre {self.MIN_LIMIT} y {self.MAX_LIMIT}"
            )

        offset = (page - 1) * limit
        entries = await self.entry_repo.get_all(
            user_id=user_id,
            entry_type=entry_type,
            limit=limit,
            offset=offset,
        )
        total = await self.entry_repo.count(user_id=user_id, entry_type=entry_type)
        total_pages = ceil(total / limit) if total > 0 else 0

        return PaginatedEntryResponse(
            entries=[EntryListItem.model_validate(entry) for entry in entries],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    async def get_by_id(self, entry_id: UUID, user_id: UUID) -> EntryResponse:
        entry = await self.entry_repo.get_by_id(entry_id, user_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )
        return EntryResponse.model_validate(entry)

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
        try:
            entry = await self.entry_repo.update(entry_id, user_id, data)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya tienes una entrada con ese título y tipo",
            )
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )
        return EntryResponse.model_validate(entry)

    async def update_cover_image(
        self, entry_id: UUID, user_id: UUID, file: UploadFile
    ) -> EntryResponse:
        entry = await self.entry_repo.get_by_id(entry_id, user_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )

        # save_cover_image valida magic bytes, formato y tamaño máximo (5MB)
        # y lanza HTTPException 422 si falla alguna validación.
        cover_image_path = await save_cover_image(file)
        updated_entry = await self.entry_repo.update(
            entry_id, user_id, EntryUpdate(cover_image=cover_image_path)
        )
        if updated_entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )
        return EntryResponse.model_validate(updated_entry)

    async def delete(self, entry_id: UUID, user_id: UUID) -> None:
        deleted = await self.entry_repo.delete(entry_id, user_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )
