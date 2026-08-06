"""Repositorio de IA: acceso a datos para el contexto RAG de GlyphAI.

La estrategia RAG de GlyphLog no usa embeddings vectoriales: la colección
personal (<1000 entradas) se recupera directamente de PostgreSQL y se
serializa a texto para el system prompt. Suficiente y sin infraestructura
adicional (decisión documentada en la issue #44).
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entry import Entry


class AIRepository:
    """Queries de la BD usadas por el servicio de IA."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_user_collection_summary(self, user_id: UUID) -> list[Entry]:
        """Devuelve todas las entradas del usuario, de más recientes a más antiguas.

        La priorización (completed con rating alto primero) y el recorte por
        tamaño/tokens son lógica de negocio del servicio, no de esta query.
        """
        result = await self.db.execute(
            select(Entry)
            .where(Entry.user_id == user_id)
            .order_by(Entry.created_at.desc())
        )
        return list(result.scalars().all())
