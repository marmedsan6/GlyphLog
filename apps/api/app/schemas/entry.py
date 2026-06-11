from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.entry import EntryStatus, EntryType


class EntryCreate(BaseModel):
    title: str
    type: EntryType
    status: EntryStatus

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("El título no puede estar vacío")
        if len(stripped) > 500:
            raise ValueError("El título no puede superar los 500 caracteres")
        return stripped


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
    title: str
    type: EntryType
    status: EntryStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
