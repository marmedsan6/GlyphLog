"""Servicio de enriquecimiento de entradas con datos del catálogo externo.

Auto-popula `genres` y `cover_image` de una entrada buscando la obra en el
catálogo (AniList para anime/manga, RAWG para videojuegos). Es un
enriquecimiento best-effort: si el catálogo falla o no encuentra match,
devuelve valores vacíos sin lanzar excepciones para no romper el flujo de
creación/importación.
"""

import logging
from dataclasses import dataclass, field

from app.models.entry import EntryType
from app.services.external_search_service import ExternalSearchService

logger = logging.getLogger(__name__)


@dataclass
class CatalogEnrichment:
    """Datos de catálogo que se pueden auto-poblar en una entrada."""

    genres: list[str] = field(default_factory=list)
    cover_image: str | None = None


class CatalogEnrichmentService:
    """Enriquece entradas con géneros y portada desde el catálogo externo."""

    def __init__(self, external_search_service: ExternalSearchService) -> None:
        self.external_search_service = external_search_service

    async def find_enrichment(self, title: str, entry_type: EntryType) -> CatalogEnrichment:
        """Busca géneros y portada de una obra en el catálogo externo.

        Reutiliza la caché TTL (1h) de `ExternalSearchService`. Matchea por
        título (case-insensitive) y tipo. Nunca lanza: ante cualquier error
        devuelve un `CatalogEnrichment` vacío.
        """
        try:
            # Pasamos el tipo para consultar solo la fuente relevante (AniList
            # para anime/manga, RAWG para juegos). Sin el tipo, `search` consulta
            # AniList + RAWG en paralelo, y si RAWG cuelga (ReadTimeout de 5s),
            # cada entrada de anime/manga se bloquea innecesariamente.
            response = await self.external_search_service.search(title, entry_type=entry_type)
            for result in response.results:
                if result.title.lower() == title.lower() and result.type == entry_type:
                    return CatalogEnrichment(
                        genres=result.genres,
                        cover_image=result.cover_image,
                    )
        except Exception as e:
            logger.warning(f"Error al enriquecer '{title}': {e}")
        return CatalogEnrichment()

    async def find_genres(self, title: str, entry_type: EntryType) -> list[str]:
        """Busca solo los géneros de una obra (compatibilidad con creación)."""
        enrichment = await self.find_enrichment(title, entry_type)
        return enrichment.genres
