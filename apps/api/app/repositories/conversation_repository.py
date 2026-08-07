"""Repositorio de conversaciones de GlyphAI (issue #45)."""

from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import ChatMessage, Conversation


class ConversationRepository:
    """Queries de conversaciones y mensajes de chat."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: UUID, title: str) -> Conversation:
        conversation = Conversation(user_id=user_id, title=title)
        self.db.add(conversation)
        try:
            await self.db.commit()
            await self.db.refresh(conversation)
            return conversation
        except Exception:
            await self.db.rollback()
            raise

    async def get_by_id(self, conversation_id: UUID, user_id: UUID) -> Conversation | None:
        """Conversación del usuario con sus mensajes cargados (sin N+1)."""
        result = await self.db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def add_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
    ) -> ChatMessage:
        """Añade un mensaje y actualiza `updated_at` de la conversación.

        El `updated_at` de Conversation usa `onupdate=func.now()`, que solo
        dispara al hacer UPDATE — por eso se toca explícitamente aquí, para
        que el listado por `updated_at DESC` refleje la actividad real.
        """
        message = ChatMessage(conversation_id=conversation_id, role=role, content=content)
        self.db.add(message)
        await self.db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(updated_at=func.now())
        )
        try:
            await self.db.commit()
            await self.db.refresh(message)
            return message
        except Exception:
            await self.db.rollback()
            raise

    async def list_by_user(
        self,
        user_id: UUID,
        page: int,
        limit: int,
    ) -> tuple[list[Conversation], int]:
        """Conversaciones del usuario paginadas por `updated_at DESC`.

        Excluye conversaciones huérfanas (sin mensajes) con WHERE EXISTS.
        """
        has_messages = select(ChatMessage.id).where(
            ChatMessage.conversation_id == Conversation.id
        )
        base_where = (Conversation.user_id == user_id) & has_messages.exists()

        result = await self.db.execute(
            select(Conversation)
            .where(base_where)
            .order_by(Conversation.updated_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        conversations = list(result.scalars().all())

        total_result = await self.db.execute(
            select(func.count()).select_from(Conversation).where(base_where)
        )
        total = total_result.scalar_one()
        return conversations, total

    async def delete(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Elimina la conversación si pertenece al usuario; False si no existe."""
        conversation = await self.db.get(Conversation, conversation_id)
        if conversation is None or conversation.user_id != user_id:
            return False
        await self.db.delete(conversation)
        try:
            await self.db.commit()
            return True
        except Exception:
            await self.db.rollback()
            raise
