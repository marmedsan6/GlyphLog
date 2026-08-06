"""Schemas para GlyphAI (chat con IA)."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

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
    """Request de chat: historial de mensajes en orden cronológico."""

    messages: list[ChatMessage] = Field(min_length=1, max_length=50)
