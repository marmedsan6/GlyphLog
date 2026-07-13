from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_external_search_service
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.external_search import ExternalSearchResponse
from app.services.external_search_service import ExternalSearchService

router = APIRouter(prefix="/external", tags=["external-search"])


@router.get("/search", response_model=ExternalSearchResponse)
async def search_external(
    q: str = Query(..., description="Query de búsqueda para el catálogo externo"),
    current_user: User = Depends(get_current_user),
    service: ExternalSearchService = Depends(get_external_search_service),
) -> ExternalSearchResponse:
    # Criterio: Si la query está vacía o es muy corta (< 3 caracteres), se retorna 400 Bad Request
    stripped_q = q.strip()
    if len(stripped_q) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La consulta de búsqueda debe tener al menos 3 caracteres",
        )

    return await service.search(stripped_q)
