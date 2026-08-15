import asyncio
import logging
from decimal import Decimal, InvalidOperation
from typing import Any

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
      genres
      coverImage { large }
    }
  }
  manga: Page(perPage: 5) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      title { english romaji }
      startDate { year }
      chapters
      genres
      coverImage { large }
    }
  }
}
"""

# Consulta GraphQL para buscar un único tipo (anime o manga).
# El tipo se inyecta vía variable para poder acotar la búsqueda desde el
# endpoint `/external/search?type=...`.
SEARCH_BY_TYPE_QUERY = """
query ($search: String, $type: MediaType) {
  Page(perPage: 5) {
    media(search: $search, type: $type, sort: SEARCH_MATCH) {
      title { english romaji }
      seasonYear
      episodes
      chapters
      startDate { year }
      genres
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

    async def _post_query(
        self, client: httpx.AsyncClient, query: str, variables: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Ejecuta una query GraphQL con reintentos y devuelve el bloque `data`.

        Retorna None si ocurre un error de red/API para que la capa de servicio
        pueda diferenciar un resultado vacío real de un fallo temporal.
        """
        max_retries = 2
        delay = 0.5

        for attempt in range(max_retries + 1):
            try:
                response = await client.post(
                    self.BASE_URL,
                    json={"query": query, "variables": variables},
                    timeout=5.0,
                )

                if response.status_code == 200:
                    body = response.json()

                    # AniList retorna errores GraphQL en el body con campo "errors"
                    if "errors" in body and "data" not in body:
                        logger.warning(f"AniList returned GraphQL errors: {body['errors']}")
                        return None

                    data = body.get("data", {})
                    return data if isinstance(data, dict) else {}

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

        return None

    async def search_anime_manga(
        self, client: httpx.AsyncClient, query: str
    ) -> list[ExternalSearchResult] | None:
        """Busca anime y manga en AniList con una sola petición GraphQL.

        Retorna una lista combinada de resultados de anime y manga,
        o None si ocurre un error de red/API.
        """
        data = await self._post_query(client, SEARCH_QUERY, {"search": query})
        if data is None:
            return None
        return self._parse_combined_response(data)

    async def search_by_type(
        self, client: httpx.AsyncClient, query: str, media_type: EntryType
    ) -> list[ExternalSearchResult] | None:
        """Busca un único tipo (anime o manga) en AniList.

        Solo admite `EntryType.anime` o `EntryType.manga` (los videojuegos
        vienen de RAWG). Retorna None si ocurre un error de red/API.
        """
        anilist_type = "ANIME" if media_type == EntryType.anime else "MANGA"
        data = await self._post_query(
            client, SEARCH_BY_TYPE_QUERY, {"search": query, "type": anilist_type}
        )
        if data is None:
            return None
        return self._parse_typed_response(data, media_type)

    def _parse_combined_response(self, data: dict[str, Any]) -> list[ExternalSearchResult]:
        """Convierte la respuesta GraphQL combinada (anime + manga) de AniList."""
        results: list[ExternalSearchResult] = []

        anime_page = data.get("anime", {})
        for item in anime_page.get("media", []):
            results.append(self._build_anime_result(item))

        manga_page = data.get("manga", {})
        for item in manga_page.get("media", []):
            results.append(self._build_manga_result(item))

        return results

    def _parse_typed_response(
        self, data: dict[str, Any], media_type: EntryType
    ) -> list[ExternalSearchResult]:
        """Convierte la respuesta GraphQL de un único tipo de AniList."""
        results: list[ExternalSearchResult] = []
        page = data.get("Page", {})
        for item in page.get("media", []):
            if media_type == EntryType.anime:
                results.append(self._build_anime_result(item))
            else:
                results.append(self._build_manga_result(item))
        return results

    def _build_anime_result(self, item: dict[str, Any]) -> ExternalSearchResult:
        title = (
            item.get("title", {}).get("english")
            or item.get("title", {}).get("romaji")
            or "Sin título"
        )
        return ExternalSearchResult(
            title=title,
            year=item.get("seasonYear"),
            cover_image=item.get("coverImage", {}).get("large"),
            type=EntryType.anime,
            source="AniList",
            progress_total=_to_decimal_or_none(item.get("episodes")),
            genres=item.get("genres") or [],
        )

    def _build_manga_result(self, item: dict[str, Any]) -> ExternalSearchResult:
        title = (
            item.get("title", {}).get("english")
            or item.get("title", {}).get("romaji")
            or "Sin título"
        )
        year = None
        start_date = item.get("startDate")
        if start_date:
            year = start_date.get("year")

        return ExternalSearchResult(
            title=title,
            year=year,
            cover_image=item.get("coverImage", {}).get("large"),
            type=EntryType.manga,
            source="AniList",
            progress_total=_to_decimal_or_none(item.get("chapters")),
            genres=item.get("genres") or [],
        )
