from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.enums import ProgressEventType, ProgressUnit


def _validate_progress_value_decimals(value: float) -> float:
    """Valida que un valor de progreso tenga como máximo 2 decimales."""
    if round(value, 2) != value:
        raise ValueError("El valor de progreso debe tener como máximo 2 decimales")
    return value


class ProgressEventCreate(BaseModel):
    """Schema para crear un evento de progreso."""

    previous_value: float | None = Field(default=None, ge=0)
    current_value: float = Field(..., ge=0)
    unit: ProgressUnit
    note: str | None = Field(default=None, max_length=1000)
    source: str = Field(default="web", max_length=50)
    event_type: ProgressEventType = Field(default=ProgressEventType.update)

    @field_validator("previous_value", "current_value")
    @classmethod
    def validate_decimals(cls, v: float | None) -> float | None:
        if v is None:
            return None
        return _validate_progress_value_decimals(v)


class ProgressEventResponse(BaseModel):
    """Schema de respuesta para un evento de progreso."""

    id: UUID
    entry_id: UUID
    previous_value: float | None
    current_value: float
    unit: ProgressUnit
    recorded_at: datetime
    note: str | None
    source: str
    event_type: ProgressEventType
    user_id: UUID | None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def delta(self) -> float | None:
        """Diferencia entre el valor actual y el anterior."""
        if self.previous_value is None:
            return None
        return self.current_value - self.previous_value

    model_config = ConfigDict(from_attributes=True)


class PaginatedProgressHistoryResponse(BaseModel):
    """Schema para la respuesta paginada del historial de progreso."""

    events: list[ProgressEventResponse]
    next_cursor: str | None = None
    has_more: bool = False



class ProgressResetRequest(BaseModel):
    """Schema para solicitar el reinicio del seguimiento de una entrada."""

    reason: str | None = Field(default=None, max_length=500)
    new_type: str | None = Field(default=None, max_length=20)
    new_progress_total: float | None = Field(default=None, ge=0)


class ProgressUpdateRequest(BaseModel):
    """Schema para actualizar manualmente el progreso."""

    new_value: float = Field(..., ge=0)
    note: str | None = Field(default=None, max_length=1000)
    mark_completed: bool = Field(default=False)

    @field_validator("new_value")
    @classmethod
    def validate_decimals(cls, v: float) -> float:
        return _validate_progress_value_decimals(v)
