"""Schemas para GlyphAI (chat con IA y conversaciones persistentes)."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

ChatRole = Literal["user", "assistant", "system"]


class ChatMessage(BaseModel):
    """Mensaje individual del historial de chat enviado por el cliente."""

    role: ChatRole
    content: str = Field(min_length=1, max_length=100_000)

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        # Rechaza mensajes de solo espacios/whitespace con 422 (no esperar
        # a que el proveedor de IA los rechace con un error menos claro).
        if not v.strip():
            raise ValueError("El mensaje no puede estar vacío")
        return v


class ChatRequest(BaseModel):
    """Request de chat: historial de mensajes + conversación persistente opcional.

    Si `conversation_id` se omite, se crea una conversación nueva y tanto el
    mensaje del usuario como la respuesta se persisten en ella. El widget
    flotante (efímero) no envía `conversation_id`.
    """

    messages: list[ChatMessage] = Field(min_length=1, max_length=50)
    conversation_id: UUID | None = None


class ChatMessageResponse(BaseModel):
    """Mensaje persistido devuelto por la API."""

    id: UUID
    role: ChatRole
    content: str
    # El atributo ORM se llama `message_metadata` (por reserva de `metadata` en
    # SQLAlchemy Declarative); el JSON expone `metadata`.
    metadata: dict[str, Any] | None = Field(default=None, validation_alias="message_metadata")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationListItem(BaseModel):
    """Item del listado de conversaciones (sidebar de /chat)."""

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    """Conversación completa con todos sus mensajes."""

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessageResponse]

    model_config = ConfigDict(from_attributes=True)


class PaginatedConversationsResponse(BaseModel):
    """Respuesta paginada de conversaciones (mismo formato que entries)."""

    conversations: list[ConversationListItem]
    total: int
    page: int
    limit: int
    total_pages: int
