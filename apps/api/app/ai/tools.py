"""Herramientas del agente de GlyphAI.

Cada tool opera sobre la colección del usuario autenticado. El `user_id` se
inyecta vía `RunnableConfig` (nunca desde los argumentos que propone el LLM),
garantizando el mismo scoping de seguridad que el resto de la app.

Las tools se construyen con un factory (`build_agent_tools`) que cierra sobre
el `EntryService`, de modo que toda la lógica de negocio (validación, errores
409/422/404) ya está encapsulada en la capa de servicio.
"""

import logging
from uuid import UUID

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool

from app.models.entry import EntryStatus, EntryType
from app.schemas.entry import EntryCreate, EntryUpdate
from app.services.entry_service import EntryService

logger = logging.getLogger(__name__)


def _user_id_from(config: RunnableConfig) -> UUID:
    """Extrae el user_id inyectado en el config del agente."""
    return UUID(str(config["configurable"]["user_id"]))


def build_agent_tools(entry_service: EntryService) -> list[BaseTool]:
    """Construye las tools del agente con el servicio inyectado."""

    @tool
    async def search_collection(query: str | None, config: RunnableConfig) -> str:
        """Consulta la colección del usuario (anime/manga/juegos).

        Devuelve las entradas del usuario, opcionalmente filtradas por título
        (búsqueda por subcadena). Úsala para responder preguntas sobre qué está
        viendo/leyendo/jugando el usuario, o para localizar una entrada antes de
        actualizarla.

        Args:
            query: Texto opcional para filtrar por título. Vacío devuelve todas.
        """
        user_id = _user_id_from(config)
        entries = await entry_service.get_all(
            user_id=user_id,
            search=query or None,
            limit=50,
        )
        if entries.total == 0:
            return "El usuario no tiene entradas que coincidan."
        lines = [f"{e.title} [{e.type.value}] — {e.status.value}" for e in entries.entries]
        return "\n".join(lines)

    @tool
    async def create_entry(
        title: str,
        type: str,
        status: str,
        rating: float | None,
        year: int | None,
        notes: str | None,
        genres: list[str] | None,
        config: RunnableConfig,
    ) -> str:
        """Crea una entrada nueva en la colección del usuario.

        Úsala cuando el usuario pida añadir un anime/manga/videojuego a su
        colección.

        Args:
            title: Título de la obra.
            type: Uno de "anime", "manga" o "game".
            status: Uno de "watching", "completed", "on_hold", "dropped", "plan_to_watch".
            rating: Puntuación 1-10, o None si no se indica.
            year: Año de publicación, o None.
            notes: Notas libres, o None.
            genres: Lista de géneros, o None.
        """
        user_id = _user_id_from(config)
        try:
            created = await entry_service.create(
                user_id=user_id,
                data=EntryCreate(
                    title=title,
                    type=EntryType(type),
                    status=EntryStatus(status),
                    rating=rating,
                    year=year,
                    notes=notes,
                    genres=genres,
                ),
            )
            return f"Entrada '{created.title}' creada correctamente."
        except Exception as e:
            return f"No se pudo crear la entrada: {e}"

    @tool
    async def update_entry(
        entry_id: str,
        status: str | None,
        rating: float | None,
        current_progress: float | None,
        notes: str | None,
        genres: list[str] | None,
        config: RunnableConfig,
    ) -> str:
        """Actualiza campos de una entrada existente de la colección.

        Úsala cuando el usuario pida cambiar el estado, rating, progreso o notas
        de una entrada que ya existe. Primero localiza la entrada con
        `search_collection` para obtener su `entry_id`.

        Args:
            entry_id: UUID de la entrada a actualizar.
            status: Nuevo estado (watching/completed/on_hold/dropped/plan_to_watch), o None.
            rating: Nueva puntuación 1-10, o None.
            current_progress: Nuevo progreso actual, o None.
            notes: Nuevas notas, o None.
            genres: Nueva lista de géneros, o None.
        """
        user_id = _user_id_from(config)
        try:
            updated = await entry_service.update(
                entry_id=UUID(entry_id),
                user_id=user_id,
                data=EntryUpdate(
                    status=EntryStatus(status) if status else None,
                    rating=rating,
                    current_progress=current_progress,
                    notes=notes,
                    genres=genres,
                ),
            )
            return f"Entrada '{updated.title}' actualizada correctamente."
        except Exception as e:
            return f"No se pudo actualizar la entrada: {e}"

    return [search_collection, create_entry, update_entry]
