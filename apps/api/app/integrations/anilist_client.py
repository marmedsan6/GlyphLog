import asyncio
import logging
from decimal import Decimal, InvalidOperation

import httpx

from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResult

logger = logging.getLogger(__name__)

# Consulta GraphQL que obtiene anime y manga en una sola petición.
# Usamos alias (anime/manga) para diferenciar los dos bloques de resultados.
# Pedimos `episodes` (anime) y `chapters` (manga) para precargar el total
# esperado del progreso desde el catálogo (issue #38).
SEARCH_QUERY = """
query ($search: String) {
  anime: Page(perPage: 5) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      title { english romaji }
      seasonYear
      episodes
      coverImage { large }
    }
  }
  manga: Page(perPage: 5) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      title { english romaji }
      startDate { year }
      chapters
      coverImage { large }
    }
  }
}
"""


def _to_decimal_or_none(value: int | None) -> Decimal | None:
    """Convierte un int de AniList a Decimal, devolviendo None si es None o 0."""
    if value is None or value == 0:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


class AniListClient:
    """Cliente para la API GraphQL de AniList.

    Reemplaza a JikanClient para obtener datos de anime y manga.
    AniList tiene infraestructura propia (no depende de MyAnimeList),
    rate limits generosos (90 req/min) y no requiere API key.
    """

    BASE_URL = "https://graphql.anilist.co"

    async def search_anime_manga(
        self, client: httpx.AsyncClient, query: str
    ) -> list[ExternalSearchResult] | None:
        """Busca anime y manga en AniList con una sola petición GraphQL.

        Retorna una lista combinada de resultados de anime y manga,
        o None si ocurre un error de red/API (para que la capa de servicio
        pueda diferenciar un resultado vacío real de un fallo temporal).
        """
        max_retries = 2
        delay = 0.5

        for attempt in range(max_retries + 1):
            try:
                response = await client.post(
                    self.BASE_URL,
                    json={"query": SEARCH_QUERY, "variables": {"search": query}},
                    timeout=5.0,
                )

                if response.status_code == 200:
                    body = response.json()

                    # AniList retorna errores GraphQL en el body con campo "errors"
                    if "errors" in body and "data" not in body:
                        logger.warning(f"AniList returned GraphQL errors: {body['errors']}")
                        return None

                    return self._parse_response(body.get("data", {}))

                # Reintentar para rate limit (429) o errores de servidor (5xx)
                if response.status_code in (429, 500, 502, 503, 504) and attempt < max_retries:
                    logger.warning(
                        f"AniList search returned status {response.status_code}. "
                        f"Retrying in {delay}s (attempt {attempt + 1}/{max_retries})..."
                    )
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue

                logger.warning(
                    f"AniList search failed with status {response.status_code} "
                    f"after {attempt + 1} attempts"
                )
                return None

            except (httpx.RequestError, httpx.TimeoutException) as e:
                if attempt < max_retries:
                    logger.warning(
                        f"Network error querying AniList on attempt {attempt + 1}: {e}. "
                        f"Retrying in {delay}s..."
                    )
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                logger.error(f"Network error querying AniList after {attempt + 1} attempts: {e}")
                return None
            except Exception as e:
                logger.error(f"Unexpected error querying AniList: {e}")
                return None

    def _parse_response(self, data: dict) -> list[ExternalSearchResult]:
        """Convierte la respuesta GraphQL de AniList en ExternalSearchResult."""
        results: list[ExternalSearchResult] = []

        # Parsear anime
        anime_page = data.get("anime", {})
        for item in anime_page.get("media", []):
            title = (
                item.get("title", {}).get("english")
                or item.get("title", {}).get("romaji")
                or "Sin título"
            )
            results.append(
                ExternalSearchResult(
                    title=title,
                    year=item.get("seasonYear"),
                    cover_image=item.get("coverImage", {}).get("large"),
                    type=EntryType.anime,
                    source="AniList",
                    progress_total=_to_decimal_or_none(item.get("episodes")),
                )
            )

        # Parsear manga
        manga_page = data.get("manga", {})
        for item in manga_page.get("media", []):
            title = (
                item.get("title", {}).get("english")
                or item.get("title", {}).get("romaji")
                or "Sin título"
            )
            year = None
            start_date = item.get("startDate")
            if start_date:
                year = start_date.get("year")

            results.append(
                ExternalSearchResult(
                    title=title,
                    year=year,
                    cover_image=item.get("coverImage", {}).get("large"),
                    type=EntryType.manga,
                    source="AniList",
                    progress_total=_to_decimal_or_none(item.get("chapters")),
                )
            )

        return results
