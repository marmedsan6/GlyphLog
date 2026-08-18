from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_external_search_service
from app.core.security import AuthenticatedUser, get_current_user_flexible
from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResponse, GamePlaytimeResponse
from app.services.external_search_service import ExternalSearchService

router = APIRouter(prefix="/external", tags=["external-search"])


@router.get("/search", response_model=ExternalSearchResponse)
async def search_external(
    q: str = Query(..., description="Query de búsqueda para el catálogo externo"),
    type: EntryType | None = Query(
        None, description="Filtrar por tipo (anime | manga | game)"
    ),
    auth: AuthenticatedUser = Depends(get_current_user_flexible),
    service: ExternalSearchService = Depends(get_external_search_service),
) -> ExternalSearchResponse:
    # Criterio: Si la query está vacía o es muy corta (< 3 caracteres), se retorna 400 Bad Request
    stripped_q = q.strip()
    if len(stripped_q) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La consulta de búsqueda debe tener al menos 3 caracteres",
        )

    return await service.search(stripped_q, entry_type=type)


@router.get("/games/playtime", response_model=GamePlaytimeResponse)
async def get_game_playtime(
    title: str = Query(..., description="Título del juego para buscar en HowLongToBeat"),
    auth: AuthenticatedUser = Depends(get_current_user_flexible),
    service: ExternalSearchService = Depends(get_external_search_service),
) -> GamePlaytimeResponse:
    """Obtiene el tiempo de juego (horas) de un juego desde HowLongToBeat.

    El listado de búsqueda de IGDB no trae el playtime, así que el frontend
    hace esta llamada adicional cuando el usuario selecciona un juego de los
    resultados de autocompletado (lazy fetch), para precargar `progress_total`
    en horas para el tipo `game`.

    Degrada con elegancia: si HLTB no encuentra el juego o falla, devuelve
    `playtime_hours=None` para que el frontend no rompa el flujo.
    """
    stripped_title = title.strip()
    if not stripped_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El título del juego es obligatorio",
        )

    return await service.get_game_playtime(stripped_title)
