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
from app.models.entry import EntryType
from app.routers.ai import (
    get_chat_recommendation_service,
    get_conversation_service,
)
from app.routers.youtube_discovery import get_youtube_discovery_service
from app.schemas.recommendation import Recommendation, RecommendationMetadata
from app.schemas.youtube_discovery import AnalysisMetadata, YoutubeSuggestion
from app.services.agent_service import AgentEvent, AgentService
from app.services.conversation_service import ConversationService
from app.services.recommendation_service import InsufficientCollectionError
from app.services.youtube_discovery_service import YoutubeDiscoveryService
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


def _recommendation() -> Recommendation:
    return Recommendation(
        title="Steins;Gate",
        type=EntryType.anime,
        match_percentage=92,
        reason="Ciencia ficción como tus favoritos",
        genres=["Sci-Fi", "Thriller"],
        year=2011,
        external_url="https://anilist.co/search/Steins%3BGate",
        cover_image_url="https://example.com/cover.jpg",
        similar_to=["Attack on Titan"],
    )


def _metadata() -> RecommendationMetadata:
    return RecommendationMetadata(
        analyzed_entries=6,
        favorite_genres=["Sci-Fi"],
        avg_rating=8.5,
        completion_rate=66.7,
        model="claude-haiku-4.5",
    )


def mock_recommendation_service(
    *, raise_error: Exception | None = None
) -> AsyncMock:
    service = AsyncMock()
    result = AsyncMock()
    result.recommendations = [_recommendation()]
    result.metadata = _metadata()
    if raise_error is not None:
        service.generate_recommendations.side_effect = raise_error
    else:
        service.generate_recommendations.return_value = result
    return service


class TestGenerateChatRecommendations:
    async def test_requires_auth(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/ai/recommendations", json={"type": "anime"}
        )
        assert response.status_code == 401

    async def test_generates_and_persists_recommendations(self, client: AsyncClient) -> None:
        user = make_user()
        override_current_user(user)
        conversation = make_conversation(user_id=user.id)

        rec_service = mock_recommendation_service()
        conv_service = mock_conversation_service()
        conv_service.create_for_chat.return_value = conversation

        app.dependency_overrides[get_chat_recommendation_service] = lambda: rec_service
        app.dependency_overrides[get_conversation_service] = lambda: conv_service
        try:
            response = await client.post(
                "/api/v1/ai/recommendations",
                json={"type": "anime"},
            )
        finally:
            clear_overrides()

        assert response.status_code == 200
        body = response.json()
        assert body["conversation_id"] == str(conversation.id)
        assert body["recommendations"][0]["title"] == "Steins;Gate"
        assert body["metadata"]["favorite_genres"] == ["Sci-Fi"]

        # Se persiste el turno del usuario y el mensaje del asistente con metadata.
        rec_service.generate_recommendations.assert_awaited_once_with(
            user_id=user.id,
            entry_type=EntryType.anime,
            limit=5,
            strict=True,
        )
        calls = [c.args for c in conv_service.add_message.await_args_list]
        # Primer call: mensaje user disparador.
        assert calls[0][0] == conversation.id
        assert calls[0][1] == "user"
        assert calls[0][2] == "Recomiéndame anime"
        # Segundo call: mensaje assistant con content + metadata.
        assert calls[1][0] == conversation.id
        assert calls[1][1] == "assistant"
        assert "Steins;Gate" in calls[1][2]
        assert "recommendations" in calls[1][3]

    async def test_returns_404_for_unknown_conversation(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        conv_service = mock_conversation_service()
        conv_service.get_for_user.return_value = None

        app.dependency_overrides[get_conversation_service] = lambda: conv_service
        app.dependency_overrides[get_chat_recommendation_service] = (
            lambda: mock_recommendation_service()
        )
        try:
            response = await client.post(
                "/api/v1/ai/recommendations",
                json={"type": "anime", "conversation_id": str(uuid4())},
            )
        finally:
            clear_overrides()

        assert response.status_code == 404
        assert response.json()["detail"] == "Conversación no encontrada"

    async def test_returns_422_for_insufficient_collection(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        rec_service = mock_recommendation_service(
            raise_error=InsufficientCollectionError(
                "Necesitas al menos 5 entradas en tu colección para recibir recomendaciones."
            )
        )
        conv_service = mock_conversation_service()

        app.dependency_overrides[get_chat_recommendation_service] = lambda: rec_service
        app.dependency_overrides[get_conversation_service] = lambda: conv_service
        try:
            response = await client.post(
                "/api/v1/ai/recommendations", json={"type": "anime"}
            )
        finally:
            clear_overrides()

        assert response.status_code == 422
        assert "5 entradas" in response.json()["detail"]

    async def test_returns_422_for_invalid_type(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        try:
            response = await client.post(
                "/api/v1/ai/recommendations", json={"type": "libro"}
            )
        finally:
            clear_overrides()

        assert response.status_code == 422


def _suggestion() -> YoutubeSuggestion:
    return YoutubeSuggestion(
        title="Death Note",
        type=EntryType.anime,
        mentioned_by="The Anime Man",
        video_title="Top 10 Psychological Thrillers",
        video_url="https://www.youtube.com/watch?v=abc123",
        opinion="positive",
        rating=9,
        timestamp="3:42",
        in_collection=False,
        external_url=None,
        cover_image_url=None,
    )


def _analysis_metadata() -> AnalysisMetadata:
    from datetime import datetime

    return AnalysisMetadata(
        channels_analyzed=1,
        videos_analyzed=20,
        titles_found=1,
        new_suggestions=1,
        tokens_used=0,
        analyzed_at=datetime(2026, 8, 15, 12, 0, 0),
    )


def mock_youtube_service(
    *, raise_error: Exception | None = None
) -> AsyncMock:
    service = AsyncMock(spec=YoutubeDiscoveryService)
    if raise_error is not None:
        service.analyze_channels.side_effect = raise_error
    else:
        service.analyze_channels.return_value = ([_suggestion()], _analysis_metadata())
    return service


class TestGenerateChatYoutube:
    async def test_requires_auth(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/ai/youtube",
            json={"channel_urls": ["https://www.youtube.com/@TheAnimeMan"]},
        )
        assert response.status_code == 401

    async def test_generates_and_persists_suggestions(self, client: AsyncClient) -> None:
        user = make_user()
        override_current_user(user)
        conversation = make_conversation(user_id=user.id)

        yt_service = mock_youtube_service()
        conv_service = mock_conversation_service()
        conv_service.create_for_chat.return_value = conversation

        app.dependency_overrides[get_youtube_discovery_service] = lambda: yt_service
        app.dependency_overrides[get_conversation_service] = lambda: conv_service
        try:
            response = await client.post(
                "/api/v1/ai/youtube",
                json={"channel_urls": ["https://www.youtube.com/@TheAnimeMan"]},
            )
        finally:
            clear_overrides()

        assert response.status_code == 200
        body = response.json()
        assert body["conversation_id"] == str(conversation.id)
        assert body["suggestions"][0]["title"] == "Death Note"

        # El servicio se invoca con las URLs y el user_id del usuario.
        yt_service.analyze_channels.assert_awaited_once_with(
            user_id=user.id,
            channel_urls=["https://www.youtube.com/@TheAnimeMan"],
        )

        calls = [c.args for c in conv_service.add_message.await_args_list]
        assert calls[0][0] == conversation.id
        assert calls[0][1] == "user"
        assert "TheAnimeMan" in calls[0][2]
        assert calls[1][0] == conversation.id
        assert calls[1][1] == "assistant"
        assert "Death Note" in calls[1][2]
        assert "suggestions" in calls[1][3]

    async def test_returns_404_for_unknown_conversation(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        conv_service = mock_conversation_service()
        conv_service.get_for_user.return_value = None

        app.dependency_overrides[get_conversation_service] = lambda: conv_service
        app.dependency_overrides[get_youtube_discovery_service] = lambda: mock_youtube_service()
        try:
            response = await client.post(
                "/api/v1/ai/youtube",
                json={
                    "channel_urls": ["https://www.youtube.com/@TheAnimeMan"],
                    "conversation_id": str(uuid4()),
                },
            )
        finally:
            clear_overrides()

        assert response.status_code == 404
        assert response.json()["detail"] == "Conversación no encontrada"

    async def test_returns_422_for_empty_urls(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        try:
            response = await client.post("/api/v1/ai/youtube", json={"channel_urls": []})
        finally:
            clear_overrides()

        assert response.status_code == 422

    async def test_returns_400_for_invalid_urls(self, client: AsyncClient) -> None:
        override_current_user(make_user())
        yt_service = mock_youtube_service(raise_error=ValueError("Ninguna URL de canal válida"))
        conv_service = mock_conversation_service()

        app.dependency_overrides[get_youtube_discovery_service] = lambda: yt_service
        app.dependency_overrides[get_conversation_service] = lambda: conv_service
        try:
            response = await client.post(
                "/api/v1/ai/youtube",
                json={"channel_urls": ["no-es-una-url"]},
            )
        finally:
            clear_overrides()

        assert response.status_code == 400
        assert "URL" in response.json()["detail"]
