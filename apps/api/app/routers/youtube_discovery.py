"""
Router para el sistema de descubrimiento desde YouTube.

Expone el endpoint para analizar canales de YouTube y generar sugerencias
de contenido usando Claude/Bedrock.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.dependencies import get_entry_repository
from app.core.security import AuthenticatedUser, get_current_user
from app.integrations.bedrock.client import BedrockClient
from app.integrations.youtube.client import YouTubeClient
from app.repositories.entry_repository import EntryRepository
from app.schemas.youtube_discovery import (
    YoutubeAnalysisRequest,
    YoutubeAnalysisResponse,
)
from app.services.youtube_discovery_service import YoutubeDiscoveryService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_youtube_client() -> YouTubeClient:
    """Dependency para obtener el cliente de YouTube."""
    if not settings.youtube_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="YouTube discovery no está disponible en este momento. "
            "Configure YOUTUBE_API_KEY para habilitar esta funcionalidad.",
        )
    return YouTubeClient(api_key=settings.youtube_api_key)


def get_bedrock_client() -> BedrockClient:
    """Dependency para obtener el cliente de Bedrock."""
    return BedrockClient(
        model_id=settings.bedrock_model_id,
        region=settings.bedrock_region,
        max_tokens=4096,
    )


def get_youtube_discovery_service(
    youtube_client: YouTubeClient = Depends(get_youtube_client),
    bedrock_client: BedrockClient = Depends(get_bedrock_client),
    entry_repo: EntryRepository = Depends(get_entry_repository),
) -> YoutubeDiscoveryService:
    """Dependency para obtener el servicio de YouTube discovery."""
    return YoutubeDiscoveryService(
        youtube_client=youtube_client,
        bedrock_client=bedrock_client,
        entry_repo=entry_repo,
    )


@router.post("/analyze", response_model=YoutubeAnalysisResponse)
async def analyze_channels(
    request: YoutubeAnalysisRequest,
    auth: AuthenticatedUser = Depends(get_current_user),
    service: YoutubeDiscoveryService = Depends(get_youtube_discovery_service),
) -> YoutubeAnalysisResponse:
    """
    Analiza canales de YouTube y genera sugerencias de contenido.

    Proceso:
    1. Obtiene los últimos 10-20 vídeos de cada canal
    2. Extrae transcripts/subtítulos de los vídeos
    3. Analiza con Claude/Bedrock para extraer menciones
    4. Cruza con la colección del usuario
    5. Devuelve sugerencias enriquecidas

    **Notas:**
    - Máximo 5 canales por request
    - El análisis puede tardar 60-90 segundos
    - Consume ~40-60k tokens de Bedrock por análisis
    - Requiere YOUTUBE_API_KEY configurada

    **Quota de YouTube API:**
    - 10,000 units/día
    - Este endpoint consume ~100-500 units (1-5 canales × 20 vídeos)
    """
    try:
        suggestions, metadata = await service.analyze_channels(
            user_id=auth.id,
            channel_urls=request.channel_urls,
        )

        return YoutubeAnalysisResponse(
            suggestions=suggestions,
            metadata=metadata,
        )

    except ValueError as e:
        logger.error(f"Error de validación en análisis: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error inesperado en análisis de YouTube: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al analizar canales de YouTube. "
            "Verifica que las URLs sean válidas e inténtalo de nuevo.",
        )
