import asyncio
import logging
from threading import Lock
from typing import Any

import httpx
from cachetools import TTLCache

from app.schemas.external_search import (
    ExternalSearchResponse,
    GameDetailResponse,
)
from app.integrations.anilist_client import AniListClient
from app.integrations.rawg_client import RawgClient, _playtime_to_hours

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

    async def search(self, query: str) -> ExternalSearchResponse:
        # Sanitizar y normalizar query
        normalized_query = query.strip().lower()

        # Buscar en caché
        cached_results = self.cache.get(normalized_query)
        if cached_results is not None:
            return ExternalSearchResponse(results=cached_results)

        # Si no está en caché, consultar APIs externas en paralelo.
        # AniList combina anime + manga en 1 sola petición GraphQL,
        # por lo que solo necesitamos 2 tareas (antes eran 3 con Jikan).
        async with httpx.AsyncClient() as client:
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
                self.cache.set(normalized_query, results)

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
