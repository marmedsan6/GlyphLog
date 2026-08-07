"""Servicio de recomendaciones inteligentes con Claude/Bedrock."""

import logging
from urllib.parse import quote
from uuid import UUID

from app.integrations.llm import JsonLlm
from app.models.entry import EntryStatus, EntryType
from app.repositories.entry_repository import EntryRepository
from app.schemas.recommendation import (
    GenerateRecommendationsResponse,
    Recommendation,
    RecommendationMetadata,
)
from app.services.external_search_service import ExternalSearchService

logger = logging.getLogger(__name__)


class RecommendationService:
    """Servicio para generar recomendaciones personalizadas con un LLM."""

    def __init__(
        self,
        llm_client: JsonLlm,
        entry_repository: EntryRepository,
        external_search_service: ExternalSearchService,
    ):
        self.llm_client = llm_client
        self.entry_repository = entry_repository
        self.external_search_service = external_search_service

    async def generate_recommendations(
        self, user_id: UUID, entry_type: EntryType | None = None, limit: int = 10
    ) -> GenerateRecommendationsResponse:
        """
        Genera recomendaciones personalizadas usando Claude.

        Args:
            user_id: ID del usuario
            entry_type: Filtro opcional por tipo
            limit: Número de recomendaciones

        Returns:
            GenerateRecommendationsResponse con recomendaciones y metadata
        """
        logger.info(f"Generando {limit} recomendaciones para user {user_id}")

        # Obtener colección completa del usuario
        all_entries = await self.entry_repository.list_by_user(user_id)

        if len(all_entries) < 5:
            logger.warning(f"Usuario {user_id} tiene < 5 entradas, recomendaciones limitadas")

        # Filtrar por tipo si se especifica
        if entry_type:
            entries = [e for e in all_entries if e.type == entry_type]
        else:
            entries = all_entries

        # Calcular métricas del usuario
        metadata = self._calculate_metadata(entries)

        # Construir prompt para Claude
        prompt = self._build_recommendation_prompt(entries, limit, entry_type)

        try:
            # Invocar el LLM configurado (Bedrock en prod, OpenAI en dev)
            recommendations_data = self.llm_client.invoke_json(
                prompt=prompt,
                temperature=0.8,  # Mayor creatividad para recomendaciones
                system="You are a recommendation engine for anime/manga/videogames.",
            )

            if not isinstance(recommendations_data, list):
                raise ValueError("Claude no devolvió un array JSON")

            # Validar y convertir a Recommendation
            recommendations: list[Recommendation] = []
            for item in recommendations_data[:limit]:
                try:
                    rec = Recommendation(**item)
                    recommendations.append(rec)
                except Exception as e:
                    logger.warning(f"Error al validar recomendación: {e}")

            # Enriquecer con datos de APIs externas
            await self._enrich_recommendations(recommendations)

            logger.info(f"Generadas {len(recommendations)} recomendaciones exitosamente")

            return GenerateRecommendationsResponse(
                recommendations=recommendations, metadata=metadata
            )

        except Exception as e:
            logger.error(f"Error al generar recomendaciones: {e}")
            raise

    def _calculate_metadata(self, entries: list) -> RecommendationMetadata:
        """Calcula metadata del usuario basada en su colección."""
        if not entries:
            return RecommendationMetadata(
                analyzed_entries=0,
                favorite_genres=[],
                avg_rating=0.0,
                completion_rate=0.0,
                model="claude-sonnet-4.5",
            )

        completed_count = sum(1 for e in entries if e.status == EntryStatus.completed)
        completion_rate = (completed_count / len(entries)) * 100 if entries else 0

        ratings = [e.rating for e in entries if e.rating is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0.0

        # Géneros favoritos (placeholder - necesitaría campo genres en Entry)
        favorite_genres: list[str] = []

        return RecommendationMetadata(
            analyzed_entries=len(entries),
            favorite_genres=favorite_genres,
            avg_rating=float(avg_rating),
            completion_rate=float(completion_rate),
            model="claude-sonnet-4.5",
        )

    def _build_recommendation_prompt(
        self, entries: list, limit: int, entry_type: EntryType | None
    ) -> str:
        """Construye el prompt para Claude."""
        # Ordenar entradas por rating descendente
        sorted_entries = sorted(
            [e for e in entries if e.rating is not None], key=lambda x: x.rating or 0, reverse=True
        )

        # Formatear entradas para el prompt
        entries_formatted = "\n".join(
            [
                f"- {e.title} ({e.type.value}, {e.status.value}, {e.rating}/10)"
                for e in sorted_entries[:30]  # Máximo 30 para no exceder límites
            ]
        )

        completed_count = sum(1 for e in entries if e.status == EntryStatus.completed)
        completion_rate = (completed_count / len(entries)) * 100 if entries else 0

        ratings = [e.rating for e in entries if e.rating is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0.0

        type_filter = f" (only {entry_type.value})" if entry_type else ""

        return f"""Analyze this user's collection and recommend {limit} new titles{type_filter} that match their taste.

USER COLLECTION (sorted by rating DESC):
{entries_formatted}

PATTERNS:
- Completion rate: {completion_rate:.1f}%
- Average rating: {avg_rating:.1f}/10
- Total entries: {len(entries)}

Recommend {limit} titles the user hasn't watched/read/played yet.
Prioritize titles similar to their highest-rated entries.

For each recommendation, provide:
- title (string)
- type (anime | manga | game)
- match_percentage (0-100, based on similarity to their taste)
- reason (string, explain WHY this matches their taste, reference specific titles they rated high)
- genres (array of strings)
- similar_to (array of strings, titles from their collection)

Return ONLY a JSON array of recommendations, no additional text."""

    async def _enrich_recommendations(self, recommendations: list[Recommendation]) -> None:
        """Enriquece recomendaciones con datos de APIs externas."""
        for rec in recommendations:
            try:
                # Buscar en catálogos externos
                search_results = await self.external_search_service.search(rec.title)

                # Buscar match por título y tipo
                matches = [
                    r
                    for r in search_results.results
                    if r.title.lower() == rec.title.lower() and r.type == rec.type
                ]

                if matches:
                    match = matches[0]
                    # URL-encode del título para que el link de búsqueda sea válido
                    rec.external_url = (
                        f"https://anilist.co/search/{quote(match.title)}"
                    )
                    rec.cover_image_url = match.cover_image
                    rec.year = match.year
                    logger.debug(f"Enriquecida recomendación: {rec.title}")
                else:
                    logger.debug(f"No se encontró match externo para: {rec.title}")

            except Exception as e:
                logger.warning(f"Error al enriquecer recomendación {rec.title}: {e}")
