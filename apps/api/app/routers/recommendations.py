"""Router para el sistema de recomendaciones."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import (
    get_bedrock_client,
    get_entry_repository,
    get_external_search_service,
)
from app.core.security import AuthenticatedUser, get_current_user
from app.integrations.bedrock.client import BedrockClient
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
    bedrock_client: BedrockClient = Depends(get_bedrock_client),
    entry_repo: EntryRepository = Depends(get_entry_repository),
    external_search: ExternalSearchService = Depends(get_external_search_service),
) -> RecommendationService:
    """Dependency para obtener el servicio de recomendaciones."""
    return RecommendationService(bedrock_client, entry_repo, external_search)


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
            user_id=auth.user_id, entry_type=request.type, limit=request.limit
        )
    except Exception as e:
        logger.error(f"Error inesperado al generar recomendaciones: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al generar recomendaciones",
        )
