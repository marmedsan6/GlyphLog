"""Router de estadísticas del usuario."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import AuthenticatedUser, get_current_user_flexible
from app.schemas.stats import UserStats
from app.services.stats_service import StatsService

router = APIRouter()


@router.get("/stats/overview", response_model=UserStats)
async def get_stats_overview(
    auth: AuthenticatedUser = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_db),
) -> UserStats:
    """
    Obtiene estadísticas completas del usuario.

    Incluye:
    - Total de entradas por tipo y estado
    - Ratings promedio globales y por tipo
    - Tasas de completado
    - Distribución de ratings
    - Progreso acumulado
    - Timeline de entradas añadidas
    - Racha de actualizaciones

    **Performance**: Optimizado para <100ms con hasta 1000 entradas.
    """
    service = StatsService(db)
    stats = await service.get_user_stats(auth.id)
    return UserStats(**stats)
