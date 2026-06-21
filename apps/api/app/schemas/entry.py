from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.entry import EntryStatus, EntryType


class EntryCreate(BaseModel):
    title: str
    type: EntryType
    status: EntryStatus
    rating: float | None = Field(default=None, ge=1.0, le=10.0)
    year: int | None = Field(default=None, ge=1950, le=2100)
    notes: str | None = Field(default=None, max_length=5000)
    cover_image: str | None = None  # Ruta relativa asignada por el servicio de uploads

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("El título no puede estar vacío")
        if len(stripped) > 500:
            raise ValueError("El título no puede superar los 500 caracteres")
        return stripped

    @field_validator("notes")
    @classmethod
    def notes_strip(cls, v: str | None) -> str | None:
        if v is not None:
            return v.strip()
        return v


class EntryUpdate(BaseModel):
    title: str | None = None
    status: EntryStatus | None = None

    @field_validator("title")
    @classmethod
    def title_not_empty_if_present(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("El título no puede estar vacío")
            return stripped
        return v


class EntryResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    type: EntryType
    status: EntryStatus
    rating: float | None
    year: int | None
    notes: str | None
    cover_image: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EntryListItem(BaseModel):
    """Schema para ítems del listado de colección.

    Excluye user_id por decisión de diseño: en el listado propio del usuario
    autenticado no es necesario exponer el identificador interno.
    """

    id: UUID
    title: str
    type: EntryType
    status: EntryStatus
    rating: float | None
    cover_image: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedEntryResponse(BaseModel):
    entries: list[EntryListItem]
    total: int
    page: int
    limit: int
    total_pages: int
