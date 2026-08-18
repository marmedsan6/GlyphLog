"""Tests unitarios del ConversationService (repositorio mockeado)."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.repositories.conversation_repository import ConversationRepository
from app.schemas.ai import ChatMessage
from app.services.conversation_service import TITLE_MAX_CHARS, ConversationService
from tests.factories import make_conversation


@pytest.fixture
def service() -> tuple[ConversationService, AsyncMock]:
    repo = AsyncMock(spec=ConversationRepository)
    return ConversationService(repo), repo


class TestCreateForChat:
    async def test_title_from_first_user_message(self, service) -> None:
        conversation_service, repo = service
        user_id = uuid4()
        repo.create.return_value = make_conversation(
            user_id=user_id, title="¿Qué anime me recomiendas?"
        )

        await conversation_service.create_for_chat(
            user_id,
            [
                ChatMessage(role="user", content="¿Qué anime me recomiendas?"),
                ChatMessage(role="assistant", content="Depende de tu colección"),
            ],
        )

        repo.create.assert_awaited_once_with(user_id, "¿Qué anime me recomiendas?")

    async def test_title_truncated_to_60_chars(self, service) -> None:
        conversation_service, repo = service
        long_message = "a" * 100
        await conversation_service.create_for_chat(
            uuid4(), [ChatMessage(role="user", content=long_message)]
        )

        title = repo.create.await_args.args[1]
        assert len(title) == TITLE_MAX_CHARS
        assert title == "a" * 60

    async def test_title_falls_back_to_first_message_when_no_user_role(self, service) -> None:
        conversation_service, repo = service
        await conversation_service.create_for_chat(
            uuid4(), [ChatMessage(role="assistant", content="Hola desde el asistente")]
        )
        assert repo.create.await_args.args[1] == "Hola desde el asistente"


class TestDelegation:
    async def test_get_for_user_delegates(self, service) -> None:
        conversation_service, repo = service
        conversation_id, user_id = uuid4(), uuid4()
        await conversation_service.get_for_user(conversation_id, user_id)
        repo.get_by_id.assert_awaited_once_with(conversation_id, user_id)

    async def test_add_message_delegates(self, service) -> None:
        conversation_service, repo = service
        conversation_id = uuid4()
        await conversation_service.add_message(conversation_id, "assistant", "respuesta")
        repo.add_message.assert_awaited_once_with(conversation_id, "assistant", "respuesta", None)

    async def test_add_message_passes_metadata(self, service) -> None:
        conversation_service, repo = service
        conversation_id = uuid4()
        metadata = {"recommendations": [{"title": "Steins;Gate"}]}
        await conversation_service.add_message(
            conversation_id, "assistant", "respuesta", metadata
        )
        repo.add_message.assert_awaited_once_with(
            conversation_id, "assistant", "respuesta", metadata
        )

    async def test_list_by_user_delegates(self, service) -> None:
        conversation_service, repo = service
        await conversation_service.list_by_user(uuid4(), 2, 15)
        repo.list_by_user.assert_awaited_once()

    async def test_delete_returns_false_when_repo_says_no(self, service) -> None:
        conversation_service, repo = service
        repo.delete.return_value = False
        assert await conversation_service.delete(uuid4(), uuid4()) is False
