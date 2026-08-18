"""Servicio de recomendaciones inteligentes con Claude/Bedrock."""

import logging
from urllib.parse import quote
from uuid import UUID

from app.core.config import settings
from app.integrations.llm import JsonLlm
from app.models.entry import Entry, EntryStatus, EntryType
from app.repositories.entry_repository import EntryRepository
from app.schemas.recommendation import (
    GenerateRecommendationsResponse,
    Recommendation,
    RecommendationMetadata,
)
from app.services.external_search_service import ExternalSearchService

logger = logging.getLogger(__name__)


class InsufficientCollectionError(ValueError):
    """La colección del usuario no permite generar recomendaciones.

    Se lanza solo en modo `strict` (endpoint del chat): el usuario necesita al
    menos 5 entradas y, si pide un tipo concreto, al menos una de ese tipo.
    """


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
        self,
        user_id: UUID,
        entry_type: EntryType | None = None,
        limit: int = 10,
        strict: bool = False,
    ) -> GenerateRecommendationsResponse:
        """
        Genera recomendaciones personalizadas usando Claude.

        Args:
            user_id: ID del usuario
            entry_type: Filtro opcional por tipo
            limit: Número de recomendaciones
            strict: si es True, lanza `InsufficientCollectionError` cuando no hay
                suficientes entradas (<5 o ninguna del tipo pedido). El endpoint
                legacy (/recommendations/generate) usa False (solo warning).

        Returns:
            GenerateRecommendationsResponse con recomendaciones y metadata
        """
        logger.info(f"Generando {limit} recomendaciones para user {user_id}")

        # Obtener colección completa del usuario
        all_entries = await self.entry_repository.list_by_user(user_id)

        if len(all_entries) < 5:
            if strict:
                raise InsufficientCollectionError(
                    "Necesitas al menos 5 entradas en tu colección para recibir recomendaciones."
                )
            logger.warning(f"Usuario {user_id} tiene < 5 entradas, recomendaciones limitadas")

        # Filtrar por tipo si se especifica
        if entry_type:
            entries = [e for e in all_entries if e.type == entry_type]
        else:
            entries = all_entries

        if strict and not entries:
            if entry_type is None:
                raise InsufficientCollectionError(
                    "No tienes entradas en tu colección para recibir recomendaciones."
                )
            raise InsufficientCollectionError(
                f"No tienes entradas de tipo '{entry_type.value}'. "
                "Añade alguna antes de pedir recomendaciones de ese tipo."
            )

        # Calcular métricas del usuario
        metadata = self._calculate_metadata(entries)

        # Construir prompt para Claude (incluye géneros por entrada y favoritos)
        prompt = self._build_recommendation_prompt(
            entries, limit, entry_type, metadata.favorite_genres
        )

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

    def _calculate_metadata(self, entries: list[Entry]) -> RecommendationMetadata:
        """Calcula metadata del usuario basada en su colección."""
        model_name = self._get_model_name()

        if not entries:
            return RecommendationMetadata(
                analyzed_entries=0,
                favorite_genres=[],
                avg_rating=0.0,
                completion_rate=0.0,
                model=model_name,
            )

        completed_count = sum(1 for e in entries if e.status == EntryStatus.completed)
        completion_rate = (completed_count / len(entries)) * 100 if entries else 0

        ratings = [e.rating for e in entries if e.rating is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0.0

        # Géneros favoritos: los más frecuentes entre las entradas con géneros,
        # ordenados por frecuencia descendente y luego alfabético (determinista).
        favorite_genres = self._calculate_favorite_genres(entries)

        return RecommendationMetadata(
            analyzed_entries=len(entries),
            favorite_genres=favorite_genres,
            avg_rating=float(avg_rating),
            completion_rate=float(completion_rate),
            model=model_name,
        )

    @staticmethod
    def _calculate_favorite_genres(entries: list[Entry]) -> list[str]:
        """Géneros más frecuentes de la colección (top por frecuencia)."""
        counts: dict[str, int] = {}
        for entry in entries:
            for genre in entry.genres or []:
                counts[genre] = counts.get(genre, 0) + 1
        if not counts:
            return []
        # Orden determinista: frecuencia desc, luego nombre asc para desempate.
        return sorted(counts, key=lambda g: (-counts[g], g))

    def _get_model_name(self) -> str:
        """Devuelve un nombre legible del modelo configurado."""
        model_id = settings.bedrock_model_id
        if "haiku" in model_id.lower():
            return "claude-haiku-4.5"
        if "sonnet" in model_id.lower():
            return "claude-sonnet-4.5"
        return model_id

    def _build_recommendation_prompt(
        self,
        entries: list[Entry],
        limit: int,
        entry_type: EntryType | None,
        favorite_genres: list[str],
    ) -> str:
        """Construye el prompt para Claude."""
        # Ordenar entradas por rating descendente
        sorted_entries = sorted(
            [e for e in entries if e.rating is not None], key=lambda x: x.rating or 0, reverse=True
        )

        # Formatear entradas para el prompt, incluyendo géneros cuando existen.
        entries_formatted = "\n".join(
            [
                self._format_prompt_entry(e)
                for e in sorted_entries[:30]  # Máximo 30 para no exceder límites
            ]
        )

        completed_count = sum(1 for e in entries if e.status == EntryStatus.completed)
        completion_rate = (completed_count / len(entries)) * 100 if entries else 0

        ratings = [e.rating for e in entries if e.rating is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0.0

        type_filter = f" (only {entry_type.value})" if entry_type else ""

        favorite_genres_line = (
            f"- Favorite genres: {', '.join(favorite_genres)}"
            if favorite_genres
            else "- Favorite genres: (none detected)"
        )

        return f"""Analyze this user's collection and recommend {limit} new titles{type_filter} that match their taste.

USER COLLECTION (sorted by rating DESC):
{entries_formatted}

PATTERNS:
- Completion rate: {completion_rate:.1f}%
- Average rating: {avg_rating:.1f}/10
- Total entries: {len(entries)}
{favorite_genres_line}

Recommend {limit} titles the user hasn't watched/read/played yet.
Prioritize titles similar to their highest-rated entries and matching their favorite genres.

For each recommendation, provide:
- title (string)
- type (anime | manga | game)
- match_percentage (0-100, based on similarity to their taste)
- reason (string, explain WHY this matches their taste, reference specific titles they rated high)
- genres (array of strings)
- similar_to (array of strings, titles from their collection)

Return ONLY a JSON array of recommendations, no additional text."""

    @staticmethod
    def _format_prompt_entry(entry: Entry) -> str:
        """Serializa una entrada para el prompt, incluyendo sus géneros."""
        genres = f", genres: {', '.join(entry.genres)}" if entry.genres else ""
        return (
            f"- {entry.title} ({entry.type.value}, {entry.status.value}, "
            f"{entry.rating}/10{genres})"
        )

    async def _enrich_recommendations(self, recommendations: list[Recommendation]) -> None:
        """Enriquece recomendaciones con datos de APIs externas."""
        for rec in recommendations:
            try:
                # Buscar en catálogos externos (filtramos por tipo para que los
                # juegos se resuelvan desde IGDB con su `slug`).
                search_results = await self.external_search_service.search(rec.title, rec.type)

                # Buscar match por título y tipo
                matches = [
                    r
                    for r in search_results.results
                    if r.title.lower() == rec.title.lower() and r.type == rec.type
                ]

                if matches:
                    match = matches[0]
                    if rec.type == EntryType.game:
                        # Los juegos se resuelven desde IGDB; la URL de detalle
                        # usa el slug cuando está disponible.
                        if match.slug:
                            rec.external_url = f"https://www.igdb.com/games/{match.slug}"
                        else:
                            rec.external_url = (
                                f"https://www.igdb.com/search?type=1&q={quote(match.title)}"
                            )
                    else:
                        # Anime y manga vienen de AniList.
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

    @staticmethod
    def format_recommendations_as_text(
        recommendations: list[Recommendation], entry_type: EntryType
    ) -> str:
        """Serializa la lista de recomendaciones a texto legible para el agente.

        Este texto se persiste como `content` del mensaje `assistant`, de modo
        que en turnos posteriores entra al historial y GlyphAI puede refinar la
        lista (filtrar, descartar, pedir más).
        """
        type_label = {
            EntryType.anime: "anime",
            EntryType.manga: "manga",
            EntryType.game: "videojuegos",
        }[entry_type]
        lines = [f"Te he recomendado estos {len(recommendations)} {type_label}:"]
        for rec in recommendations:
            lines.append(f"- {rec.title} ({rec.match_percentage}% match): {rec.reason}")
        return "\n".join(lines)
