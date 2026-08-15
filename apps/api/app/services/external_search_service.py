import asyncio
import logging
from threading import Lock
from typing import Any

import httpx
from cachetools import TTLCache

from app.integrations.anilist_client import AniListClient
from app.integrations.rawg_client import RawgClient, _playtime_to_hours
from app.models.entry import EntryType
from app.schemas.external_search import (
    ExternalSearchResponse,
    GameDetailResponse,
)

logger = logging.getLogger(__name__)


class ThreadSafeCache:
    """Caché thread-safe con TTL para resultados de búsqueda externa.

    Usa cachetools.TTLCache para gestión automática de expiración y
    limpieza de entradas antiguas. Thread-safe para entornos con múltiples
    workers uvicorn.
    """

    def __init__(self, maxsize: int = 1000, ttl: int = 3600) -> None:
        # maxsize=1000: hasta 1000 queries distintas en caché
        # ttl=3600: 1 hora de TTL (más generoso que los 5 min anteriores)
        self._cache: TTLCache[str, Any] = TTLCache(maxsize=maxsize, ttl=ttl)
        self._lock = Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            value = self._cache.get(key)
            if value is not None:
                logger.info(f"Cache hit: '{key}'")
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._cache[key] = value


class ExternalSearchService:
    def __init__(self, anilist_client: AniListClient, rawg_client: RawgClient) -> None:
        self.anilist_client = anilist_client
        self.rawg_client = rawg_client
        # Caché de búsquedas: TTL de 1 hora (3600s) para reducir hits a APIs externas
        self.cache = ThreadSafeCache(maxsize=1000, ttl=3600)
        # Caché de detalles de juegos: TTL de 1 hora también
        self.game_detail_cache = ThreadSafeCache(maxsize=500, ttl=3600)

    async def search(
        self, query: str, entry_type: EntryType | None = None
    ) -> ExternalSearchResponse:
        # Sanitizar y normalizar query
        normalized_query = query.strip().lower()

        # La clave de caché incorpora el tipo para no devolver resultados de
        # otra categoría ante la misma query.
        cache_key = f"{normalized_query}::{entry_type.value if entry_type else 'all'}"

        # Buscar en caché
        cached_results = self.cache.get(cache_key)
        if cached_results is not None:
            return ExternalSearchResponse(results=cached_results)

        # Según el tipo solicitado, consultamos solo la fuente correspondiente
        # (eficiencia: elegir anime no consulta RAWG ni el bloque de manga).
        async with httpx.AsyncClient() as client:
            if entry_type == EntryType.anime:
                tasks = [self.anilist_client.search_by_type(client, query, EntryType.anime)]
            elif entry_type == EntryType.manga:
                tasks = [self.anilist_client.search_by_type(client, query, EntryType.manga)]
            elif entry_type == EntryType.game:
                tasks = [self.rawg_client.search_games(client, query)]
            else:
                # Sin tipo: consulta combinada de AniList (anime + manga) y RAWG.
                tasks = [
                    self.anilist_client.search_anime_manga(client, query),
                    self.rawg_client.search_games(client, query),
                ]

            # return_exceptions=True para que si una llamada falla, no cancele las demás.
            # Cumple: "Si una API falla (timeout, error, rate limit), las demás siguen funcionando"
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            results = []
            has_failures = False
            for response in responses:
                if isinstance(response, Exception):
                    logger.error(f"Fallo en llamada externa (excepción): {str(response)}")
                    has_failures = True
                elif response is None:
                    logger.error("Fallo en llamada externa (retornó None)")
                    has_failures = True
                elif isinstance(response, list):
                    results.extend(response)

            # Ordenar por título alfabéticamente para devolver resultados ordenados
            results.sort(key=lambda x: x.title.lower())

            # Guardar en caché únicamente si todas las llamadas a
            # APIs externas activas tuvieron éxito
            if not has_failures:
                self.cache.set(cache_key, results)

            return ExternalSearchResponse(results=results)

    async def get_game_detail(self, slug: str) -> GameDetailResponse:
        """Obtiene el detalle de un juego desde RAWG (con caché).

        Si RAWG no está configurado (sin API key) o el juego no existe,
        devuelve un GameDetailResponse con playtime None — evitando excepciones
        para que el frontend pueda degradar con elegancia.
        """
        cached = self.game_detail_cache.get(slug)
        if cached is not None:
            return cached

        async with httpx.AsyncClient() as client:
            detail = await self.rawg_client.get_game_detail(client, slug)

        if detail is None:
            # Guardamos respuesta vacía en caché para no repetir peticiones
            # sabiendo que el juego no existe o la API falló.
            response = GameDetailResponse(slug=slug, playtime_raw=None, playtime_hours=None)
        else:
            playtime_raw = detail.get("playtime")
            response = GameDetailResponse(
                slug=slug,
                playtime_raw=playtime_raw,
                playtime_hours=_playtime_to_hours(playtime_raw),
            )

        self.game_detail_cache.set(slug, response)
        return response
