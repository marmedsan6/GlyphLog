"""Schemas para el sistema de importación inteligente."""

from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, field_validator

from app.models.entry import EntryStatus, EntryType


class ImportSource(str, Enum):
    """Fuentes soportadas para importación."""

    MAL = "mal"  # MyAnimeList
    ANILIST = "anilist"  # AniList
    KITSU = "kitsu"  # Kitsu
    STEAM = "steam"  # Steam
    TEXT = "text"  # Texto libre


class ParsedEntry(BaseModel):
    """Entrada parseada por Claude desde una lista externa."""

    title: str = Field(..., description="Título de la obra")
    type: EntryType = Field(..., description="Tipo de entrada")
    status: EntryStatus = Field(..., description="Estado de seguimiento")
    rating: int | None = Field(None, ge=1, le=10, description="Rating de 1 a 10")
    current_progress: Decimal | None = Field(None, ge=0, description="Progreso actual")
    progress_total: Decimal | None = Field(None, ge=0, description="Progreso total")
    year: int | None = Field(None, ge=1900, le=2100, description="Año de lanzamiento")
    notes: str | None = Field(None, max_length=1000, description="Notas del usuario")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Confianza del parseo (0.0-1.0)"
    )

    @field_validator("current_progress", "progress_total")
    @classmethod
    def validate_progress(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v < 0:
            raise ValueError("El progreso no puede ser negativo")
        return v


class ImportParseRequest(BaseModel):
    """Request para parsear una lista de importación."""

    source: ImportSource = Field(..., description="Fuente de la lista")
    content: str = Field(
        ..., min_length=10, max_length=100000, description="Contenido de la lista"
    )


class ImportParseResponse(BaseModel):
    """Response del parseo de importación."""

    entries: list[ParsedEntry] = Field(..., description="Entradas parseadas")
    warnings: list[str] = Field(
        default_factory=list, description="Advertencias del parseo"
    )


class ImportError(BaseModel):
    """Error al importar una entrada."""

    title: str = Field(..., description="Título de la entrada con error")
    error: str = Field(..., description="Mensaje de error")


class ImportExecuteRequest(BaseModel):
    """Request para ejecutar la importación."""

    entries: list[ParsedEntry] = Field(
        ..., max_length=500, description="Entradas a importar (máx 500)"
    )


class ImportExecuteResponse(BaseModel):
    """Response de la ejecución de importación."""

    created: int = Field(..., ge=0, description="Número de entradas creadas")
    skipped: int = Field(..., ge=0, description="Número de entradas omitidas")
    errors: list[ImportError] = Field(
        default_factory=list, description="Errores al importar"
    )
