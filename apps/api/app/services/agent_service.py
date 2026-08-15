"""Servicio del agente de GlyphAI (LangGraph + ChatBedrock).

Convierte el chat en un agente ReAct con herramientas que pueden leer y
modificar la colección del usuario. El streaming SSE se conserva: el agente
emite fragmentos de texto vía LangGraph (`stream_mode="messages"`), que el
router reemite como `data: {"delta": ...}`.
"""

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessageChunk, HumanMessage, ToolMessage
from langchain_core.tools import BaseTool
from langgraph.prebuilt import create_react_agent

from app.core.ai_prompts import build_system_prompt
from app.repositories.ai_repository import AIRepository
from app.services.ai_context import build_collection_context

logger = logging.getLogger(__name__)


def _extract_text(content: Any) -> str:
    """Extrae texto plano del `content` de un mensaje.

    El contenido puede ser `str` o una lista de bloques de contenido al estilo
    Anthropic/Bedrock (`[{"type": "text", "text": "..."}, ...]`). Normalizamos
    ambos a `str`.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts)
    return str(content) if content else ""


@dataclass
class AgentEvent:
    """Evento emitido por el agente para el stream SSE."""

    type: str  # "delta" | "tool" | "done"
    content: str = ""


class AgentService:
    """Agente ReAct con streaming sobre LangGraph."""

    def __init__(
        self,
        llm: BaseChatModel,
        tools: list[BaseTool],
        ai_repository: AIRepository,
    ) -> None:
        self.llm = llm
        self.tools = tools
        self.ai_repository = ai_repository

    async def build_system_prompt(self, user_id: UUID) -> str:
        """Construye el system prompt con el contexto RAG de la colección."""
        entries = await self.ai_repository.get_user_collection_summary(user_id)
        return build_system_prompt(build_collection_context(entries))

    def _build_agent(self, system_prompt: str) -> Any:
        """Construye el grafo del agente con el system prompt inyectado."""
        return create_react_agent(
            self.llm,
            self.tools,
            prompt=system_prompt,
        )

    async def astream(
        self,
        messages: list[dict[str, str]],
        user_id: UUID,
        system_prompt: str,
    ) -> AsyncIterator[AgentEvent]:
        """Ejecuta el agente y emite eventos de streaming.

        Args:
            messages: Historial de mensajes en formato {role, content}.
            user_id: UUID del usuario autenticado (inyectado en el config de las tools).
            system_prompt: System prompt completo (identidad + colección + instrucciones).
        """
        agent = self._build_agent(system_prompt)
        history = [
            HumanMessage(content=m["content"]) if m["role"] == "user"
            else AIMessageChunk(content=m["content"])
            for m in messages
        ]

        config: dict[str, Any] = {"configurable": {"user_id": str(user_id)}}

        async for chunk in agent.astream(
            {"messages": history},
            config=config,
            stream_mode="messages",
        ):
            # `stream_mode="messages"` devuelve tuplas (message, metadata).
            if isinstance(chunk, tuple):
                message = chunk[0]
            else:
                message = chunk

            if isinstance(message, AIMessageChunk):
                text = _extract_text(message.content)
                if text:
                    yield AgentEvent(type="delta", content=text)
            elif isinstance(message, ToolMessage):
                # Resultado de una tool: útil para que la UI muestre "consultando
                # tu colección…". No es texto final; se emite como evento tool.
                yield AgentEvent(type="tool", content=_extract_text(message.content))

        yield AgentEvent(type="done")
