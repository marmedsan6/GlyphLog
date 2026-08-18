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
    genres: list[str] = []


class ExternalSearchResponse(BaseModel):
    results: list[ExternalSearchResult]


class GamePlaytimeResponse(BaseModel):
    """Respuesta del endpoint de tiempo de juego (HowLongToBeat).

    `playtime_hours` es la duración de la historia principal en horas (Decimal
    con 2 decimales) para usar directamente como `progress_total` en horas
    (unidad fija de games). None si no se encontró el juego o falló la consulta.
    """

    title: str
    playtime_hours: Decimal | None = None
