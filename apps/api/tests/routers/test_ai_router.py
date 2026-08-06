"""Tests del router /api/v1/ai/chat (AIService mockeado)."""

from unittest.mock import AsyncMock

from httpx import AsyncClient

from app.main import app
from app.routers.ai import get_ai_service
from app.services.ai_service import AIProviderError, AIService
from tests.factories import clear_overrides, make_user, override_current_user


async def fake_stream(*deltas: str) -> object:
    for delta in deltas:
        yield delta


def mock_ai_service() -> AsyncMock:
    """AIService mockeado con streaming fake de dos deltas."""
    service = AsyncMock(spec=AIService)
    service.is_configured.return_value = True
    service.build_collection_context.return_value = ""
    service.create_stream.return_value = fake_stream("Hola, ", "soy GlyphAI")
    return service


class TestAIChatEndpoint:
    async def test_chat_requires_auth(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/ai/chat", json={"messages": [{"role": "user", "content": "hola"}]}
        )
        assert response.status_code == 401

    async def test_chat_returns_sse_stream(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        service = mock_ai_service()
        app.dependency_overrides[get_ai_service] = lambda: service
        try:
            response = await client.post(
                "/api/v1/ai/chat", json={"messages": [{"role": "user", "content": "hola"}]}
            )
        finally:
            clear_overrides()

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        assert 'data: {"delta": "Hola, "}' in response.text
        assert 'data: {"delta": "soy GlyphAI"}' in response.text
        assert response.text.strip().endswith("data: [DONE]")

    async def test_chat_returns_503_when_not_configured(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        service = AsyncMock(spec=AIService)
        service.is_configured.return_value = False
        app.dependency_overrides[get_ai_service] = lambda: service
        try:
            response = await client.post(
                "/api/v1/ai/chat", json={"messages": [{"role": "user", "content": "hola"}]}
            )
        finally:
            clear_overrides()

        assert response.status_code == 503
        assert response.json()["detail"] == "AI service not configured"

    async def test_chat_returns_502_when_provider_connection_fails(
        self, client: AsyncClient
    ) -> None:
        override_current_user(make_user())
        service = AsyncMock(spec=AIService)
        service.is_configured.return_value = True
        service.create_stream.side_effect = AIProviderError("Connection timeout")
        app.dependency_overrides[get_ai_service] = lambda: service
        try:
            response = await client.post(
                "/api/v1/ai/chat", json={"messages": [{"role": "user", "content": "hola"}]}
            )
        finally:
            clear_overrides()

        assert response.status_code == 502
        assert "Connection timeout" in response.json()["detail"]

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
