"""Servicio de IA de GlyphAI (chat con streaming SSE).

Provider-agnostic: expone una única interfaz de streaming sobre OpenAI
(GPT-4o-mini, por defecto) o Anthropic (Claude Haiku, fallback). El proveedor
activo se elige con la variable de entorno AI_PROVIDER en .env.

Arquitectura:
- `create_stream()` establece la conexión con el proveedor y devuelve un
  AsyncIterator de fragmentos de texto. Los errores de conexión (auth,
  timeout, rate limit) se lanzan aquí como `AIProviderError`, lo que permite
  al router responder 502 ANTES de empezar el stream SSE.
- El iterador devuelto solo emite deltas de texto; los fallos a mitad del
  stream los maneja el consumidor (router) como evento de error SSE.
"""

import asyncio
import logging
from collections.abc import AsyncIterator, Iterator
from typing import Any
from uuid import UUID

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.integrations.bedrock.client import BedrockClient
from app.models.entry import Entry
from app.repositories.ai_repository import AIRepository
from app.schemas.ai import ChatMessage
from app.services.ai_context import (
    build_collection_context,
    format_entry,
)

logger = logging.getLogger(__name__)

# Límite de mensajes de historial enviados al proveedor: los más antiguos se
# truncan para dejar margen al system prompt y al contexto RAG de la colección.
MAX_HISTORY_MESSAGES = 20

# Tokens máximos de respuesta para Anthropic y Bedrock (OpenAI lo controla por modelo).
ANTHROPIC_MAX_TOKENS = 2048
BEDROCK_MAX_TOKENS = 2048


class AIServiceNotConfiguredError(Exception):
    """El proveedor de IA activo no tiene API key configurada."""


class AIProviderError(Exception):
    """La API externa del proveedor falló (auth, timeout, rate limit, red)."""


class AIService:
    """Servicio provider-agnostic de chat con streaming.

    Los parámetros del constructor permiten inyectar valores en tests sin
    tocar el entorno; por defecto leen de `settings`.
    """

    def __init__(
        self,
        provider: str | None = None,
        openai_api_key: str | None = None,
        anthropic_api_key: str | None = None,
        openai_model: str | None = None,
        anthropic_model: str | None = None,
        ai_repository: AIRepository | None = None,
        bedrock_client: BedrockClient | None = None,
    ) -> None:
        self.provider = (provider or settings.ai_provider).lower()
        self.openai_api_key = (
            openai_api_key if openai_api_key is not None else settings.openai_api_key
        )
        self.anthropic_api_key = (
            anthropic_api_key
            if anthropic_api_key is not None
            else settings.anthropic_api_key
        )
        self.openai_model = openai_model or settings.openai_model
        self.anthropic_model = anthropic_model or settings.anthropic_model
        # Cliente Bedrock inyectado por dependencias; si no llega, se construye
        # uno nuevo con las credenciales de settings (mismo modelo que usan
        # recomendaciones e importación).
        self.bedrock_client = bedrock_client
        # Repositorio inyectado por dependencias; si no llega, se construye
        # sobre la sesión que reciba build_collection_context().
        self.ai_repository = ai_repository

        if self.provider not in {"openai", "anthropic", "bedrock"}:
            raise ValueError(
                f"AI_PROVIDER inválido: {self.provider!r}. "
                "Usa 'openai', 'anthropic' o 'bedrock'."
            )

    def _get_bedrock_client(self) -> BedrockClient:
        """Devuelve el cliente Bedrock (inyectado o construido desde settings)."""
        if self.bedrock_client is not None:
            return self.bedrock_client
        return BedrockClient(
            model_id=settings.bedrock_model_id,
            region=settings.bedrock_region,
            max_tokens=BEDROCK_MAX_TOKENS,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )

    def is_configured(self) -> bool:
        """True si el proveedor activo tiene credenciales configuradas."""
        if self.provider == "openai":
            return bool(self.openai_api_key)
        if self.provider == "anthropic":
            return bool(self.anthropic_api_key)
        # Bedrock se considera configurado si hay credenciales AWS explícitas
        # en settings o un perfil/entorno resolvable por boto3.
        return bool(settings.aws_access_key_id and settings.aws_secret_access_key)

    async def create_stream(
        self,
        messages: list[ChatMessage],
        system: str | None = None,
    ) -> AsyncIterator[str]:
        """Establece la conexión con el proveedor y devuelve el stream de texto.

        Args:
            messages: Historial de mensajes (se trunca a los 20 más recientes).
            system: System prompt opcional (identidad de GlyphAI + contexto RAG).

        Raises:
            AIServiceNotConfiguredError: si el proveedor activo no tiene key.
            AIProviderError: si falla la conexión con la API externa.
        """
        self._check_configured()
        messages = messages[-MAX_HISTORY_MESSAGES:]

        if self.provider == "openai":
            stream = await self._connect_openai(messages, system)
            return self._iterate(stream, self.provider)
        if self.provider == "anthropic":
            stream = await self._connect_anthropic(messages, system)
            return self._iterate(stream, self.provider)
        return await self._stream_bedrock(messages, system)

    def _check_configured(self) -> None:
        if not self.is_configured():
            raise AIServiceNotConfiguredError(
                f"AI service not configured: falta la API key del proveedor '{self.provider}'"
            )

    # ── Contexto RAG (colección del usuario) ──────────────────────────────────

    async def build_collection_context(
        self,
        user_id: UUID,
        db: AsyncSession | None = None,
    ) -> str:
        """Construye el contexto de la colección del usuario para el system prompt.

        Devuelve un bloque de texto estructurado (≤ ~3000 tokens) con título,
        tipo, estado, rating (si existe) y progreso de cada entrada. Vacío si
        el usuario no tiene entradas.

        Priorización para colecciones grandes (>200): entradas `completed` con
        rating alto primero, luego las más recientes; el resto se descarta.
        """
        repository = self.ai_repository
        if repository is None:
            # Sin repo inyectado, se construye sobre la sesión recibida.
            if db is None:
                raise ValueError(
                    "Se necesita un AIRepository inyectado o una sesión de BD "
                    "para construir el contexto de colección"
                )
            repository = AIRepository(db)
        entries = await repository.get_user_collection_summary(user_id)
        return build_collection_context(entries)

    def _format_entry(self, entry: Entry) -> str:
        """Serializa una entrada a una línea del contexto (delega en ai_context)."""
        return format_entry(entry)

    async def _connect_openai(
        self,
        messages: list[ChatMessage],
        system: str | None,
    ) -> AsyncIterator[Any]:
        """Inicia el streaming con OpenAI; los errores de conexión → AIProviderError."""
        client_kwargs: dict[str, str] = {"api_key": self.openai_api_key}
        if settings.openai_base_url:
            client_kwargs["base_url"] = settings.openai_base_url
        client = AsyncOpenAI(**client_kwargs)
        api_messages: list[dict[str, str]] = [
            {"role": message.role, "content": message.content} for message in messages
        ]
        if system:
            api_messages.insert(0, {"role": "system", "content": system})

        try:
            stream: AsyncIterator[Any] = await client.chat.completions.create(
                model=self.openai_model,
                messages=api_messages,
                stream=True,
            )
            return stream
        except Exception as e:
            logger.error(f"Error al iniciar streaming con OpenAI: {e}")
            raise AIProviderError(f"Error al conectar con OpenAI: {e}") from e

    async def _connect_anthropic(
        self,
        messages: list[ChatMessage],
        system: str | None,
    ) -> AsyncIterator[Any]:
        """Inicia el streaming con Anthropic; los errores de conexión → AIProviderError."""
        client = AsyncAnthropic(api_key=self.anthropic_api_key)
        api_messages: list[dict[str, str]] = [
            {"role": message.role, "content": message.content} for message in messages
        ]

        try:
            stream: AsyncIterator[Any] = await client.messages.create(
                model=self.anthropic_model,
                max_tokens=ANTHROPIC_MAX_TOKENS,
                messages=api_messages,
                system=system or [],
                stream=True,
            )
            return stream
        except Exception as e:
            logger.error(f"Error al iniciar streaming con Anthropic: {e}")
            raise AIProviderError(f"Error al conectar con Anthropic: {e}") from e

    def _bedrock_messages(self, messages: list[ChatMessage]) -> list[dict[str, str]]:
        """Convierte mensajes de chat al formato Anthropic Messages API.

        El rol `system` se descarta: el system prompt viaja por separado en el
        parámetro `system` de la llamada, no como mensaje del array.
        """
        return [
            {"role": message.role, "content": message.content}
            for message in messages
            if message.role != "system"
        ]

    async def _stream_bedrock(
        self,
        messages: list[ChatMessage],
        system: str | None,
    ) -> AsyncIterator[str]:
        """Streaming con Bedrock (Claude). Envuelve el iterador síncrono de boto3
        en un AsyncIterator para no bloquear el event loop del SSE."""
        client = self._get_bedrock_client()
        api_messages = self._bedrock_messages(messages)

        try:
            # Bedrock usa boto3 síncrono; se abre el stream en un hilo para no
            # bloquear el event loop.
            iterator: Iterator[str] = await asyncio.to_thread(
                client.open_chat_stream,
                api_messages,
                0.7,
                system,
            )
        except Exception as e:
            logger.error(f"Error al iniciar streaming con Bedrock: {e}")
            raise AIProviderError(f"Error al conectar con Bedrock: {e}") from e

        async def _async_iterate() -> AsyncIterator[str]:
            # Cada `next()` del generador síncrono espera el siguiente chunk de
            # red, por lo que se ejecuta en un thread para no bloquear el loop.
            # Se usa un sentinel porque `StopIteration` no puede propagarse a
            # través de asyncio.to_thread (interactúa mal con los Futures).
            sentinel: object = object()
            while True:
                text = await asyncio.to_thread(
                    lambda: next(iterator, sentinel)
                )
                if text is sentinel:
                    break
                yield text  # type: ignore[misc]

        return _async_iterate()

    async def _iterate(
        self,
        stream: AsyncIterator[Any],
        provider: str,
    ) -> AsyncIterator[str]:
        """Convierte el stream del SDK en un AsyncIterator de texto plano."""
        if provider == "openai":
            async for chunk in stream:
                # El último chunk de OpenAI puede llegar con `choices` vacío
                # (solo finish_reason); se ignora.
                if not getattr(chunk, "choices", None):
                    continue
                delta = chunk.choices[0].delta
                text = getattr(delta, "content", None)
                if text:
                    yield text
        else:
            async for event in stream:
                if event.type != "content_block_delta":
                    continue
                if getattr(event.delta, "type", None) != "text_delta":
                    continue
                yield event.delta.text
