import asyncio
import logging
import time

import httpx

from app.schemas.external_search import ExternalSearchResponse, ExternalSearchResult
from app.services.external_clients.anilist_client import AniListClient
from app.services.external_clients.rawg_client import RawgClient

logger = logging.getLogger(__name__)


class MemoryCache:
    def __init__(self, ttl_seconds: int = 300) -> None:
        self.ttl = ttl_seconds
        self.cache = {}

    def get(self, key: str) -> list[ExternalSearchResult] | None:
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                logger.info(f"Caché hit para query: '{key}'")
                return value
            else:
                del self.cache[key]
        return None

    def set(self, key: str, value: list[ExternalSearchResult]) -> None:
        self.cache[key] = (value, time.time())


class ExternalSearchService:
    def __init__(self, anilist_client: AniListClient, rawg_client: RawgClient) -> None:
        self.anilist_client = anilist_client
        self.rawg_client = rawg_client
        self.cache = MemoryCache(ttl_seconds=300) # TTL de 5 minutos configurado por defecto

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

