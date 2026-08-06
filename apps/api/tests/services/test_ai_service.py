"""Tests unitarios del AIService (proveedor OpenAI y Anthropic mockeados).

No se hacen llamadas reales a ninguna API externa en CI.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.entry import EntryStatus, EntryType
from app.repositories.ai_repository import AIRepository
from app.schemas.ai import ChatMessage
from app.services.ai_service import (
    MAX_COLLECTION_ENTRIES,
    MAX_CONTEXT_CHARS,
    AIService,
    AIServiceNotConfiguredError,
    AIProviderError,
)
from tests.factories import make_entry


async def async_gen(items: list[object]) -> object:
    for item in items:
        yield item


def openai_chunk(content: str | None) -> object:
    """Chunk fake del SDK de OpenAI; content=None simula finish_reason."""
    if content is None:
        return SimpleNamespace(choices=[])
    return SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=content))])


def anthropic_event(text: str | None = None) -> object:
    """Evento fake del SDK de Anthropic."""
    if text is None:
        return SimpleNamespace(type="message_delta", delta=SimpleNamespace(type="text_delta"))
    return SimpleNamespace(
        type="content_block_delta",
        delta=SimpleNamespace(type="text_delta", text=text),
    )


async def collect(stream: object) -> list[str]:
    return [delta async for delta in stream]


class TestAIServiceOpenAI:
    async def test_streams_deltas_from_openai(self) -> None:
        chunks = [openai_chunk("Ho"), openai_chunk("la"), openai_chunk(None)]
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=async_gen(chunks))

        with patch("app.services.ai_service.AsyncOpenAI", return_value=mock_client):
            service = AIService(provider="openai", openai_api_key="sk-test")
            stream = await service.create_stream([ChatMessage(role="user", content="hola")])

        assert await collect(stream) == ["Ho", "la"]

    async def test_truncates_history_to_20_messages(self) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=async_gen([]))

        with patch("app.services.ai_service.AsyncOpenAI", return_value=mock_client):
            service = AIService(provider="openai", openai_api_key="sk-test")
            messages = [ChatMessage(role="user", content=f"msg {i}") for i in range(25)]
            await service.create_stream(messages)

        sent = mock_client.chat.completions.create.await_args.kwargs["messages"]
        assert len(sent) == 20
        assert sent[0]["content"] == "msg 5"  # se conservan los más recientes

    async def test_injects_system_prompt_first(self) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=async_gen([]))

        with patch("app.services.ai_service.AsyncOpenAI", return_value=mock_client):
            service = AIService(provider="openai", openai_api_key="sk-test")
            await service.create_stream(
                [ChatMessage(role="user", content="hola")],
                system="Eres GlyphAI",
            )

        sent = mock_client.chat.completions.create.await_args.kwargs["messages"]
        assert sent[0] == {"role": "system", "content": "Eres GlyphAI"}

    async def test_connection_error_raises_ai_provider_error(self) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=Exception("Connection timeout")
        )

        with patch("app.services.ai_service.AsyncOpenAI", return_value=mock_client):
            service = AIService(provider="openai", openai_api_key="sk-test")
            with pytest.raises(AIProviderError):
                await service.create_stream([ChatMessage(role="user", content="hola")])


class TestAIServiceAnthropic:
    async def test_streams_text_deltas_from_anthropic(self) -> None:
        events = [
            anthropic_event("adi"),
            SimpleNamespace(type="content_block_stop", delta=None),
            anthropic_event("ós"),
        ]
        mock_client = MagicMock()
        mock_client.messages.create = AsyncMock(return_value=async_gen(events))

        with patch("app.services.ai_service.AsyncAnthropic", return_value=mock_client):
            service = AIService(provider="anthropic", anthropic_api_key="ak-test")
            stream = await service.create_stream([ChatMessage(role="user", content="hola")])

        assert await collect(stream) == ["adi", "ós"]


class TestAIServiceConfig:
    async def test_not_configured_raises_when_openai_key_missing(self) -> None:
        service = AIService(provider="openai", openai_api_key="")
        assert service.is_configured() is False
        with pytest.raises(AIServiceNotConfiguredError):
            await service.create_stream([ChatMessage(role="user", content="hola")])

    async def test_not_configured_raises_when_anthropic_key_missing(self) -> None:
        service = AIService(provider="anthropic", anthropic_api_key="")
        with pytest.raises(AIServiceNotConfiguredError):
            await service.create_stream([ChatMessage(role="user", content="hola")])

    async def test_invalid_provider_raises_value_error(self) -> None:
        with pytest.raises(ValueError):
            AIService(provider="gemini", openai_api_key="sk-test")


class TestBuildCollectionContext:
    """Tests del contexto RAG (issue #44)."""

    def make_service(self, entries: list) -> AIService:
        repo = AsyncMock(spec=AIRepository)
        repo.get_user_collection_summary.return_value = entries
        return AIService(
            provider="openai",
            openai_api_key="sk-test",
            ai_repository=repo,
        )

    async def test_empty_collection_returns_empty_context(self) -> None:
        service = self.make_service([])
        assert await service.build_collection_context(uuid4()) == ""

    async def test_formats_entry_omitting_null_fields(self) -> None:
        user_id = uuid4()
        entry = make_entry(
            user_id=user_id,
            title="One Piece",
            entry_type=EntryType.anime,
            entry_status=EntryStatus.watching,
            rating=None,
            progress_total=1000,
            current_progress=500,
        )
        service = self.make_service([entry])

        context = await service.build_collection_context(user_id)

        assert "One Piece [anime] — watching" in context
        assert "progreso 500/1000" in context
        assert "rating" not in context  # rating null → se omite

    async def test_includes_rating_when_present(self) -> None:
        entry = make_entry(
            title="Frieren",
            entry_type=EntryType.anime,
            entry_status=EntryStatus.completed,
            rating=9.5,
            current_progress=28,
            progress_total=28,
        )
        service = self.make_service([entry])

        context = await service.build_collection_context(uuid4())

        assert "rating 9.5/10" in context
        assert "progreso 28/28" in context

    async def test_prioritizes_completed_with_rating_in_large_collection(self) -> None:
        user_id = uuid4()
        now = datetime.now(timezone.utc)
        # 250 entradas: una completed con rating 10 creada hace tiempo
        # (debe quedar primera pese a ser antigua) + 249 recientes sin rating.
        entries = [
            make_entry(
                user_id=user_id,
                title="Top Old",
                entry_type=EntryType.game,
                entry_status=EntryStatus.completed,
                rating=10,
                created_at=now - timedelta(days=30),
            )
        ]
        for i in range(249):
            entries.append(
                make_entry(
                    user_id=user_id,
                    title=f"Recent {i}",
                    entry_type=EntryType.anime,
                    entry_status=EntryStatus.watching,
                    created_at=now - timedelta(minutes=i),
                )
            )
        service = self.make_service(entries)

        context = await service.build_collection_context(user_id)

        lines = context.splitlines()
        # Se recorta a MAX_COLLECTION_ENTRIES y la priorizada va la primera.
        assert len(lines) - 1 <= MAX_COLLECTION_ENTRIES
        assert lines[1].startswith("Top Old")

    async def test_context_respects_token_budget(self) -> None:
        user_id = uuid4()
        # 200 entradas con títulos largos → el texto crudo supera con creces
        # el presupuesto de ~3000 tokens y debe recortarse por el final.
        entries = [
            make_entry(
                user_id=user_id,
                title=f"Anime con un título extremadamente largo número {i} " * 3,
                entry_type=EntryType.anime,
                entry_status=EntryStatus.watching,
            )
            for i in range(MAX_COLLECTION_ENTRIES)
        ]
        service = self.make_service(entries)

        context = await service.build_collection_context(user_id)

        assert len(context) <= MAX_CONTEXT_CHARS
        assert context.startswith("TU COLECCIÓN")
        # El recorte descarta líneas del final, nunca la cabecera.
        assert len(context.splitlines()) >= 2
