"""Tests del router /api/v1/ai.

- /chat: streaming SSE con persistencia de conversaciones (issues #43-#45).
  El AgentService y el ConversationService se mockean para aislamiento total.
- /conversations: un test E2E de ciclo de vida con la BD real (un único
  event loop — pytest-asyncio crea un loop por test y el pool global del
  engine no sobrevive entre loops en Windows).
"""

import json
from unittest.mock import AsyncMock
from uuid import uuid4

from httpx import AsyncClient

from app.core.dependencies import get_agent_service
from app.main import app
from app.routers.ai import get_conversation_service
from app.services.agent_service import AgentEvent, AgentService
from app.services.conversation_service import ConversationService
from tests.factories import (
    clear_overrides,
    make_conversation,
    make_user,
    override_current_user,
    persist_user,
)


async def fake_agent_stream(*deltas: str) -> object:
    """Stream de eventos del agente: deltas + done."""
    for delta in deltas:
        yield AgentEvent(type="delta", content=delta)
    yield AgentEvent(type="done")


def mock_agent_service(stream=None) -> AsyncMock:
    """AgentService mockeado con un stream fake de dos deltas.

    Usa `side_effect` (no `return_value`) para que CADA request reciba un
    async generator fresco.
    """
    service = AsyncMock(spec=AgentService)
    service.build_system_prompt.return_value = "Sistema GlyphAI"
    service.astream.side_effect = lambda *a, **k: stream or fake_agent_stream(
        "Hola, ", "soy GlyphAI"
    )
    return service


def mock_conversation_service() -> AsyncMock:
    """ConversationService mockeado; get_for_user devuelve None (conversación nueva)."""
    service = AsyncMock(spec=ConversationService)
    service.get_for_user.return_value = None
    service.create_for_chat.return_value = make_conversation(title="Nueva")
    return service


def override_services(agent_service, conversation_service=None) -> None:
    app.dependency_overrides[get_agent_service] = lambda: agent_service
    if conversation_service is not None:
        app.dependency_overrides[get_conversation_service] = lambda: conversation_service


def sse_events(response_text: str) -> list[dict]:
    """Parsea los eventos `data: {...}` de una respuesta SSE (excluye [DONE])."""
    return [
        json.loads(line[6:])
        for line in response_text.strip().splitlines()
        if line.startswith("data: ") and line != "data: [DONE]"
    ]


class TestAIChatEndpoint:
    async def test_chat_requires_auth(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/ai/chat", json={"messages": [{"role": "user", "content": "hola"}]}
        )
        assert response.status_code == 401

    async def test_chat_returns_sse_stream(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        conversation = make_conversation()
        conv_service = mock_conversation_service()
        conv_service.create_for_chat.return_value = conversation
        override_services(mock_agent_service(), conv_service)
        try:
            response = await client.post(
                "/api/v1/ai/chat", json={"messages": [{"role": "user", "content": "hola"}]}
            )
        finally:
            clear_overrides()

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        events = sse_events(response.text)
        assert events[0] == {"conversation_id": str(conversation.id)}
        assert events[1] == {"delta": "Hola, "}
        assert events[2] == {"delta": "soy GlyphAI"}
        assert response.text.strip().endswith("data: [DONE]")

    async def test_chat_creates_conversation_and_persists_messages(
        self, client: AsyncClient
    ) -> None:
        user = make_user()
        override_current_user(user)
        conversation = make_conversation(user_id=user.id)
        conv_service = mock_conversation_service()
        conv_service.create_for_chat.return_value = conversation
        override_services(mock_agent_service(), conv_service)
        try:
            response = await client.post(
                "/api/v1/ai/chat",
                json={"messages": [{"role": "user", "content": "Recomiéndame algo"}]},
            )
        finally:
            clear_overrides()

        assert response.status_code == 200
        # Se crea la conversación con el primer mensaje del usuario...
        conv_service.create_for_chat.assert_awaited_once()
        create_args = conv_service.create_for_chat.await_args.args
        assert create_args[0] == user.id
        assert create_args[1][0].content == "Recomiéndame algo"
        # ...y se persisten el mensaje del usuario y la respuesta completa.
        calls = [c.args for c in conv_service.add_message.await_args_list]
        assert (conversation.id, "user", "Recomiéndame algo") in calls
        assert (conversation.id, "assistant", "Hola, soy GlyphAI") in calls

    async def test_chat_resumes_existing_conversation(self, client: AsyncClient) -> None:
        user = make_user()
        override_current_user(user)
        conversation = make_conversation(user_id=user.id)
        conv_service = mock_conversation_service()
        conv_service.get_for_user.return_value = conversation
        override_services(mock_agent_service(), conv_service)
        try:
            response = await client.post(
                "/api/v1/ai/chat",
                json={
                    "messages": [{"role": "user", "content": "sigo aquí"}],
                    "conversation_id": str(conversation.id),
                },
            )
        finally:
            clear_overrides()

        assert response.status_code == 200
        # No se crea una conversación nueva; se reanuda la existente.
        conv_service.create_for_chat.assert_not_awaited()
        conv_service.get_for_user.assert_awaited_once_with(conversation.id, user.id)

    async def test_chat_returns_404_for_unknown_conversation(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        conv_service = mock_conversation_service()
        conv_service.get_for_user.return_value = None  # no es del usuario / no existe
        override_services(mock_agent_service(), conv_service)
        try:
            response = await client.post(
                "/api/v1/ai/chat",
                json={
                    "messages": [{"role": "user", "content": "hola"}],
                    "conversation_id": str(uuid4()),
                },
            )
        finally:
            clear_overrides()

        assert response.status_code == 404
        assert response.json()["detail"] == "Conversación no encontrada"

    async def test_chat_returns_422_for_blank_message(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        try:
            response = await client.post(
                "/api/v1/ai/chat",
                json={"messages": [{"role": "user", "content": "   "}]},
            )
        finally:
            clear_overrides()

        assert response.status_code == 422

    async def test_chat_returns_422_for_empty_messages(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        try:
            response = await client.post("/api/v1/ai/chat", json={"messages": []})
        finally:
            clear_overrides()

        assert response.status_code == 422


class TestConversationsEndpoints:
    """Ciclo de vida real de conversaciones (BD de test, un único loop)."""

    async def test_conversation_lifecycle(self, client: AsyncClient) -> None:
        user = await persist_user(make_user(email="lifecycle@example.com", username="lifecycle"))
        other = await persist_user(
            make_user(email="lifecycle_other@example.com", username="lifecycle_other")
        )
        override_current_user(user)
        override_services(mock_agent_service())
        try:
            # 1. Crear dos conversaciones reales vía el flujo completo de /chat.
            first = await client.post(
                "/api/v1/ai/chat",
                json={"messages": [{"role": "user", "content": "Primera conversación"}]},
            )
            second = await client.post(
                "/api/v1/ai/chat",
                json={"messages": [{"role": "user", "content": "Segunda conversación"}]},
            )
            first_id = sse_events(first.text)[0]["conversation_id"]
            second_id = sse_events(second.text)[0]["conversation_id"]

            # 2. Listado: orden por updated_at DESC (la segunda es la más reciente).
            listing = await client.get("/api/v1/ai/conversations?page=1&limit=15")

            # 3. Detalle con mensajes persistidos.
            detail = await client.get(f"/api/v1/ai/conversations/{first_id}")

            # 4. Reanudar: el chat persiste en la conversación existente.
            resumed = await client.post(
                "/api/v1/ai/chat",
                json={
                    "messages": [{"role": "user", "content": "Continuación"}],
                    "conversation_id": first_id,
                },
            )
            detail_after = await client.get(f"/api/v1/ai/conversations/{first_id}")

            # 5. Otro usuario no puede verla ni borrarla.
            override_current_user(other)
            forbidden_get = await client.get(f"/api/v1/ai/conversations/{first_id}")
            forbidden_delete = await client.delete(f"/api/v1/ai/conversations/{first_id}")

            # 6. El dueño sí puede borrarla; después ya no existe.
            override_current_user(user)
            deleted = await client.delete(f"/api/v1/ai/conversations/{first_id}")
            after_delete = await client.get(f"/api/v1/ai/conversations/{first_id}")
        finally:
            clear_overrides()

        assert first.status_code == 200 and second.status_code == 200

        body = listing.json()
        assert body["total"] == 2
        assert [c["title"] for c in body["conversations"]] == [
            "Segunda conversación",
            "Primera conversación",
        ]

        detail_body = detail.json()
        assert detail_body["title"] == "Primera conversación"
        assert [m["content"] for m in detail_body["messages"]] == [
            "Primera conversación",
            "Hola, soy GlyphAI",
        ]

        assert resumed.status_code == 200
        assert [m["content"] for m in detail_after.json()["messages"]] == [
            "Primera conversación",
            "Hola, soy GlyphAI",
            "Continuación",
            "Hola, soy GlyphAI",
        ]

        assert forbidden_get.status_code == 404
        assert forbidden_delete.status_code == 404
        assert deleted.status_code == 204
        assert after_delete.status_code == 404
        assert second_id != first_id

    async def test_list_empty(self, client: AsyncClient) -> None:
        user = await persist_user(make_user(email="list_empty@example.com", username="list_empty"))
        override_current_user(user)
        try:
            response = await client.get("/api/v1/ai/conversations")
        finally:
            clear_overrides()

        assert response.status_code == 200
        body = response.json()
        assert body["conversations"] == []
        assert body["total"] == 0
        assert body["total_pages"] == 0

    async def test_get_unknown_conversation_returns_404(self, client: AsyncClient) -> None:
        user = await persist_user(
            make_user(email="unknown_conv@example.com", username="unknown_conv")
        )
        override_current_user(user)
        try:
            response = await client.get(f"/api/v1/ai/conversations/{uuid4()}")
        finally:
            clear_overrides()

        assert response.status_code == 404
