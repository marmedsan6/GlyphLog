"""Router para el sistema de recomendaciones."""

import logging
from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import (
    get_entry_repository,
    get_external_search_service,
    get_llm_client,
)
from app.core.llm_errors import map_llm_error
from app.core.security import AuthenticatedUser, get_current_user
from app.integrations.llm import JsonLlm
from app.repositories.entry_repository import EntryRepository
from app.schemas.recommendation import (
    GenerateRecommendationsRequest,
    GenerateRecommendationsResponse,
)
from app.services.external_search_service import ExternalSearchService
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def get_recommendation_service(
    llm_client: JsonLlm = Depends(get_llm_client),
    entry_repo: EntryRepository = Depends(get_entry_repository),
    external_search: ExternalSearchService = Depends(get_external_search_service),
) -> RecommendationService:
    """Dependency para obtener el servicio de recomendaciones."""
    return RecommendationService(llm_client, entry_repo, external_search)


def _map_generation_error(error: Exception) -> NoReturn:
    """Traduce errores del proveedor LLM a HTTP con mensajes accionables."""
    mapped = map_llm_error(error)
    if mapped is not None:
        raise mapped
    if isinstance(error, ValueError):
        logger.error(f"El proveedor LLM devolvio formato inesperado: {error}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El proveedor de IA devolvio una respuesta inesperada. Intentalo de nuevo.",
        )
    logger.error(f"Error interno al generar recomendaciones: {error}")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Error interno al generar recomendaciones",
    )


@router.post("/generate", response_model=GenerateRecommendationsResponse)
async def generate_recommendations(
    request: GenerateRecommendationsRequest,
    auth: AuthenticatedUser = Depends(get_current_user),
    service: RecommendationService = Depends(get_recommendation_service),
) -> GenerateRecommendationsResponse:
    """
    Genera recomendaciones personalizadas con Claude/Bedrock.

    Analiza la colección completa del usuario (ratings, tipos, estados) y
    sugiere obras nuevas basadas en sus patrones de consumo.

    **Nota:** Este endpoint consume tokens de Bedrock (~30-50k por generación).

    **Requisito mínimo:** 5 entradas en la colección para resultados óptimos.
    """
    try:
        return await service.generate_recommendations(
            user_id=auth.id, entry_type=request.type, limit=request.limit
        )
    except Exception as e:
        raise _map_generation_error(e)
