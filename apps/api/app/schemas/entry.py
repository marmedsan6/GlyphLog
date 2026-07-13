import enum
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import Form
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.entry import EntryStatus, EntryType


class SortField(str, enum.Enum):
    created_at = "created_at"
    title = "title"
    rating = "rating"


class SortOrder(str, enum.Enum):
    asc = "asc"
    desc = "desc"


class EntryCreate(BaseModel):
    title: str
    type: EntryType
    status: EntryStatus
    rating: float | None = Field(default=None, ge=1.0, le=10.0)
    year: int | None = Field(default=None, ge=1950, le=2100)
    notes: str | None = Field(default=None, max_length=5000)
    # Ruta relativa asignada por el servicio de uploads
    cover_image: str | None = Field(default=None, max_length=500)

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
    type: EntryType | None = None
    status: EntryStatus | None = None
    rating: float | None = Field(default=None, ge=1.0, le=10.0)
    year: int | None = Field(default=None, ge=1950, le=2100)
    notes: str | None = Field(default=None, max_length=5000)
    cover_image: str | None = Field(default=None, max_length=500)

    @field_validator("title")
    @classmethod
    def title_not_empty_if_present(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("El título no puede estar vacío")
            if len(stripped) > 500:
                raise ValueError("El título no puede superar los 500 caracteres")
            return stripped
        return v

    @field_validator("notes")
    @classmethod
    def notes_strip(cls, v: str | None) -> str | None:
        if v is not None:
            return v.strip()
        return v

    @model_validator(mode="before")
    @classmethod
    def reject_null_for_required_enums(cls, data: dict[str, Any]) -> dict[str, Any]:
        """type y status son obligatorios en el modelo; permitimos omitirlos,
        pero rechazamos explícitamente `null` para evitar errores 500 de BD.
        """
        for field in ("type", "status"):
            if field in data and data[field] is None:
                raise ValueError(f"{field} no puede ser nulo")
        return data


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


class EntryCreateForm:
    """Clase de ayuda para parsear y validar campos multipart form de FastAPI

    para la creación de entradas.
    """

    def __init__(
        self,
        title: str = Form(""),
        type: str = Form(...),
        status: str = Form(...),
        rating: str | None = Form(None),
        year: str | None = Form(None),
        notes: str | None = Form(None),
        cover_image_url: str | None = Form(None),
    ) -> None:
        self.title = title
        self.type = type
        self.status = status
        self.rating = rating
        self.year = year
        self.notes = notes
        self.cover_image_url = cover_image_url

    def to_entry_create(self) -> EntryCreate:
        # Conversión segura y explícita de tipos de datos de formulario a Pydantic
        rating_value = float(self.rating) if self.rating else None
        year_value = int(self.year) if self.year else None
        notes_value = self.notes if self.notes else None
        cover_image_value = self.cover_image_url if self.cover_image_url else None
        return EntryCreate(
            title=self.title,
            type=EntryType(self.type),
            status=EntryStatus(self.status),
            rating=rating_value,
            year=year_value,
            notes=notes_value,
            cover_image=cover_image_value,
        )
