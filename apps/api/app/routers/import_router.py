"""Router para el sistema de importación inteligente."""

import logging
from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import (
    get_catalog_enrichment_service,
    get_entry_repository,
    get_llm_client,
)
from app.core.llm_errors import map_llm_error
from app.core.security import AuthenticatedUser, get_current_user
from app.integrations.llm import JsonLlm
from app.repositories.entry_repository import EntryRepository
from app.schemas.import_schema import (
    ImportExecuteRequest,
    ImportExecuteResponse,
    ImportParseRequest,
    ImportParseResponse,
)
from app.services.catalog_enrichment_service import CatalogEnrichmentService
from app.services.import_service import ImportService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/import", tags=["import"])


def get_import_service(
    llm_client: JsonLlm = Depends(get_llm_client),
    entry_repo: EntryRepository = Depends(get_entry_repository),
    enrichment: CatalogEnrichmentService = Depends(get_catalog_enrichment_service),
) -> ImportService:
    """Dependency para obtener el servicio de importación."""
    return ImportService(llm_client, entry_repo, enrichment)


def _map_parse_error(error: Exception) -> NoReturn:
    """Traduce errores del parseo a HTTP con mensajes accionables."""
    mapped = map_llm_error(error)
    if mapped is not None:
        raise mapped
    if isinstance(error, ValueError):
        logger.error(f"Error de validacion en parseo: {error}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error al parsear la lista: {str(error)}",
        )
    logger.error(f"Error interno en parseo: {error}")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Error interno al procesar la importación",
    )


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
        return await service.parse_import(request.source, request.content, str(auth.id))
    except Exception as e:
        _map_parse_error(e)


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
        return await service.execute_import(request.entries, str(auth.id))
    except Exception as e:
        logger.error(f"Error inesperado en ejecución de importación: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al ejecutar la importación",
        )
