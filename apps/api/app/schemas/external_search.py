from decimal import Decimal

from pydantic import BaseModel

from app.models.entry import EntryType


class ExternalSearchResult(BaseModel):
    title: str
    year: int | None = None
    cover_image: str | None = None
    type: EntryType
    source: str
    progress_total: Decimal | None = None
    slug: str | None = None


class ExternalSearchResponse(BaseModel):
    results: list[ExternalSearchResult]


class GameDetailResponse(BaseModel):
    """Respuesta del endpoint de detalle de un juego externo (RAWG).

    `playtime_raw` es el campo original de RAWG en minutos.
    `playtime_hours` es la conversión a Decimal con 2 decimales para usar
    directamente como `progress_total` en horas (unidad fija de games).
    """

    slug: str
    playtime_raw: int | None = None
    playtime_hours: Decimal | None = None
