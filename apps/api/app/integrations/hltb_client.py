"""Cliente para HowLongToBeat (tiempo de juego en horas).

HowLongToBeat no ofrece una API oficial; se consulta por scraping mediante la
librería `howlongtobeatpy` (MIT). Es best-effort: si la web bloquea la petición
o no hay match, devolvemos None para que el flujo degrade con elegancia.

Usamos el método síncrono `search()` envuelto en `asyncio.to_thread()` en lugar
de `async_search()`, que se cuelga contra la protección de Cloudflare.
"""

import asyncio
import logging
from decimal import Decimal
from typing import Any

from app.schemas.external_search import GamePlaytimeResponse

logger = logging.getLogger(__name__)


def _hours_to_decimal(hours: float | None) -> Decimal | None:
    """Convierte horas (float) a Decimal con 2 decimales, o None si no hay dato."""
    if hours is None or hours <= 0:
        return None
    try:
        return Decimal(str(hours)).quantize(Decimal("0.01"))
    except Exception:
        return None


class HltbClient:
    def __init__(self) -> None:
        # Import diferido para no fallar en entornos sin la dependencia instalada.
        self._client: Any = None

    def _get_client(self) -> Any:
        if self._client is None:
            from howlongtobeatpy import HowLongToBeat

            self._client = HowLongToBeat()
        return self._client

    def _search_sync(self, title: str) -> float | None:
        """Búsqueda síncrona en HowLongToBeat (ejecutada en un hilo)."""
        try:
            results = self._get_client().search(title)
        except Exception as e:
            logger.warning(f"Error consultando HowLongToBeat para '{title}': {e}")
            return None

        if not results:
            return None

        best = max(results, key=lambda entry: entry.similarity)
        main_story = best.main_story
        return float(main_story) if main_story is not None else None

    async def get_main_story_hours(self, title: str) -> GamePlaytimeResponse:
        """Obtiene las horas de la historia principal de un juego por título.

        Nunca lanza: ante cualquier error devuelve un GamePlaytimeResponse con
        playtime_hours=None para que el frontend degrade con elegancia.
        """
        try:
            hours = await asyncio.to_thread(self._search_sync, title)
        except Exception as e:
            logger.warning(f"Error inesperado consultando HowLongToBeat para '{title}': {e}")
            hours = None

        return GamePlaytimeResponse(title=title, playtime_hours=_hours_to_decimal(hours))
