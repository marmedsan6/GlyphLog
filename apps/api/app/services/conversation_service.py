"""Servicio de conversaciones de GlyphAI (issue #45).

El servicio delega en ConversationRepository; el router decide los errores
HTTP (404 si la conversación no existe o no es del usuario).
"""

from uuid import UUID

from app.models.conversation import Conversation
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.ai import ChatMessage

# Título automático: primeros 60 caracteres del primer mensaje del usuario.
TITLE_MAX_CHARS = 60


class ConversationService:
    def __init__(self, repository: ConversationRepository) -> None:
        self.repository = repository

    async def create_for_chat(
        self,
        user_id: UUID,
        messages: list[ChatMessage],
    ) -> Conversation:
        """Crea una conversación nueva con título generado del primer mensaje."""
        first_user_message = next(
            (m.content for m in messages if m.role == "user"),
            messages[0].content if messages else "",
        )
        title = first_user_message.strip()[:TITLE_MAX_CHARS] or "Nueva conversación"
        return await self.repository.create(user_id, title)

    async def get_for_user(self, conversation_id: UUID, user_id: UUID) -> Conversation | None:
        """Conversación con mensajes si pertenece al usuario; None si no."""
        return await self.repository.get_by_id(conversation_id, user_id)

    async def add_message(self, conversation_id: UUID, role: str, content: str) -> None:
        """Persiste un mensaje y actualiza `updated_at` de la conversación."""
        await self.repository.add_message(conversation_id, role, content)

    async def list_by_user(
        self,
        user_id: UUID,
        page: int,
        limit: int,
    ) -> tuple[list[Conversation], int]:
        """Lista paginada por `updated_at DESC`, sin conversaciones huérfanas."""
        return await self.repository.list_by_user(user_id, page, limit)

    async def delete(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Elimina la conversación; False si no existe o no es del usuario."""
        return await self.repository.delete(conversation_id, user_id)
