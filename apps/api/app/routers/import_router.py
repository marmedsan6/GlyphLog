"""Router para el sistema de importación inteligente."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_bedrock_client, get_entry_repository
from app.core.security import get_current_user
from app.integrations.bedrock.client import BedrockClient
from app.repositories.entry_repository import EntryRepository
from app.schemas.auth import AuthenticatedUser
from app.schemas.import_schema import (
    ImportExecuteRequest,
    ImportExecuteResponse,
    ImportParseRequest,
    ImportParseResponse,
)
from app.services.import_service import ImportService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/import", tags=["import"])


def get_import_service(
    bedrock_client: BedrockClient = Depends(get_bedrock_client),
    entry_repo: EntryRepository = Depends(get_entry_repository),
) -> ImportService:
    """Dependency para obtener el servicio de importación."""
    return ImportService(bedrock_client, entry_repo)


@router.post("/parse", response_model=ImportParseResponse)
async def parse_import(
    request: ImportParseRequest,
    auth: AuthenticatedUser = Depends(get_current_user),
    service: ImportService = Depends(get_import_service),
) -> ImportParseResponse:
    """
    Parsea una lista de contenido con Claude/Bedrock.

    **Fuentes soportadas:**
    - `mal`: MyAnimeList (XML o HTML)
    - `anilist`: AniList (JSON export)
    - `kitsu`: Kitsu (JSON export)
    - `steam`: Steam (lista de juegos)
    - `text`: Texto libre

    **Nota:** Este endpoint consume tokens de Bedrock (~5-15k por lista de 100 entradas).
    """
    try:
        return await service.parse_import(request.source, request.content, str(auth.user_id))
    except ValueError as e:
        logger.error(f"Error de validación en parseo: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error al parsear la lista: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Error inesperado en parseo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al procesar la importación",
        )


@router.post("/execute", response_model=ImportExecuteResponse)
async def execute_import(
    request: ImportExecuteRequest,
    auth: AuthenticatedUser = Depends(get_current_user),
    service: ImportService = Depends(get_import_service),
) -> ImportExecuteResponse:
    """
    Ejecuta la importación de entradas parseadas.

    Crea las entradas en batch dentro de una transacción.
    Las entradas duplicadas (por título) se omiten automáticamente.
    """
    try:
        return await service.execute_import(request.entries, str(auth.user_id))
    except Exception as e:
        logger.error(f"Error inesperado en ejecución de importación: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al ejecutar la importación",
        )
