import asyncio
import logging
from decimal import Decimal, InvalidOperation

import httpx

from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResult

logger = logging.getLogger(__name__)


def _playtime_to_hours(playtime: int | None) -> Decimal | None:
    """Convierte el playtime de RAWG a Decimal con 2 decimales.

    RAWG expone `playtime` (mediana de horas jugadas por la comunidad) en el
    detalle del juego, ya en horas. Lo convertimos a Decimal con 2 decimales
    para encajar con el esquema Numeric(10,2) de `progress_total` (la unidad
    fija del tipo `game` es `hours`). Valores None o 0 devuelven None (sin
    total sugerido).
    """
    if playtime is None or playtime == 0:
        return None
    try:
        return Decimal(playtime).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None


class RawgClient:
    BASE_URL = "https://api.rawg.io/api"

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def search_games(
        self, client: httpx.AsyncClient, query: str
    ) -> list[ExternalSearchResult] | None:
        if not self.api_key:
            logger.info("RAWG_API_KEY no configurada. Omitiendo búsqueda de videojuegos.")
            return []

        try:
            response = await client.get(
                f"{self.BASE_URL}/games",
                params={"search": query, "key": self.api_key, "page_size": 5},
                timeout=5.0,
            )
            if response.status_code != 200:
                logger.warning(f"RAWG search returned status {response.status_code}")
                return None

            data = response.json().get("results", [])
            results = []
            for item in data:
                title = item.get("name") or "Sin título"

                # Extraer año de la fecha de lanzamiento (released: "2013-09-17")
                year = None
                released = item.get("released")
                if released and isinstance(released, str) and "-" in released:
                    try:
                        year = int(released.split("-")[0])
                    except ValueError:
                        pass

                cover_image = item.get("background_image")
                genres = [g.get("name") for g in item.get("genres", []) if g.get("name")]

                results.append(
                    ExternalSearchResult(
                        title=title,
                        year=year,
                        cover_image=cover_image,
                        type=EntryType.game,
                        source="RAWG",
                        slug=item.get("slug"),
                        genres=genres,
                    )
                )
            return results
        except Exception as e:
            logger.error(f"Error querying RAWG games: {str(e)}")
            return None

    async def get_game_detail(self, client: httpx.AsyncClient, slug: str) -> dict | None:
        """Obtiene el detalle de un juego desde RAWG por slug.

        Retorna un dict con el campo `playtime` (int | None) y cualquier
        otro campo que el caller necesite, o None si ocurre un fallo de
        red/API o el juego no existe.

        El listado de search no trae `playtime`, por eso necesitamos esta
        llamada extra al detalle (lazy fetch on select).
        """
        if not self.api_key:
            logger.info("RAWG_API_KEY no configurada. Omitiendo detalle de juego.")
            return None

        max_retries = 1
        delay = 0.5

        for attempt in range(max_retries + 1):
            try:
                response = await client.get(
                    f"{self.BASE_URL}/games/{slug}",
                    params={"key": self.api_key},
                    timeout=5.0,
                )

                if response.status_code == 200:
                    body = response.json()
                    return {"playtime": body.get("playtime")}

                if response.status_code == 404:
                    logger.info(f"RAWG game not found for slug: {slug}")
                    return None

                if response.status_code in (429, 500, 502, 503, 504) and attempt < max_retries:
                    logger.warning(
                        f"RAWG detail returned status {response.status_code}. "
                        f"Retrying in {delay}s (attempt {attempt + 1}/{max_retries + 1})..."
                    )
                    await asyncio.sleep(delay)
                    continue

                logger.warning(
                    f"RAWG detail failed with status {response.status_code} "
                    f"after {attempt + 1} attempts"
                )
                return None

            except (httpx.RequestError, httpx.TimeoutException) as e:
                if attempt < max_retries:
                    logger.warning(
                        f"Network error on RAWG detail attempt {attempt + 1}: {e}. "
                        f"Retrying in {delay}s..."
                    )
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                logger.error(f"Network error on RAWG detail after {attempt + 1} attempts: {e}")
                return None
            except Exception as e:
                logger.error(f"Unexpected error querying RAWG detail: {e}")
                return None

        return None
