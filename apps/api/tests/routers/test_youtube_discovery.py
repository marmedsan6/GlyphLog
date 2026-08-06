"""
Tests para el router de YouTube discovery.

Verifica el endpoint POST /api/v1/discover/youtube/analyze.
"""

from datetime import datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.schemas.youtube_discovery import AnalysisMetadata, YoutubeSuggestion


@pytest.mark.asyncio
async def test_analyze_channels_success(client: AsyncClient, user_with_jwt):
    """Test: análisis exitoso devuelve sugerencias."""
    user, jwt_token = user_with_jwt

    request_body = {
        "channel_urls": [
            "https://www.youtube.com/@TheAnimeMan",
        ]
    }

    # Mock del servicio
    mock_suggestions = [
        YoutubeSuggestion(
            title="Death Note",
            type="anime",
            mentioned_by="The Anime Man",
            video_title="Top 10 Thrillers",
            video_url="https://www.youtube.com/watch?v=abc123",
            opinion="positive",
            rating=9,
            timestamp="5:30",
            in_collection=False,
            external_url=None,
            cover_image_url=None,
        )
    ]

    mock_metadata = AnalysisMetadata(
        channels_analyzed=1,
        videos_analyzed=10,
        titles_found=1,
        new_suggestions=1,
        tokens_used=45000,
        analyzed_at=datetime.utcnow(),
    )

    with patch(
        "app.routers.youtube_discovery.YoutubeDiscoveryService.analyze_channels",
        new=AsyncMock(return_value=(mock_suggestions, mock_metadata)),
    ):
        response = await client.post(
            "/api/v1/discover/youtube/analyze",
            json=request_body,
            headers={"Authorization": f"Bearer {jwt_token}"},
        )

    assert response.status_code == 200
    data = response.json()

    assert "suggestions" in data
    assert "metadata" in data
    assert len(data["suggestions"]) == 1
    assert data["suggestions"][0]["title"] == "Death Note"
    assert data["suggestions"][0]["type"] == "anime"
    assert data["suggestions"][0]["opinion"] == "positive"
    assert data["suggestions"][0]["rating"] == 9
    assert data["suggestions"][0]["in_collection"] is False

    assert data["metadata"]["channels_analyzed"] == 1
    assert data["metadata"]["videos_analyzed"] == 10
    assert data["metadata"]["new_suggestions"] == 1


@pytest.mark.asyncio
async def test_analyze_channels_requires_auth(client: AsyncClient):
    """Test: el endpoint requiere autenticación JWT."""
    request_body = {
        "channel_urls": ["https://www.youtube.com/@TheAnimeMan"]
    }

    response = await client.post(
        "/api/v1/discover/youtube/analyze",
        json=request_body,
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_analyze_channels_max_5_channels(client: AsyncClient, user_with_jwt):
    """Test: rechaza más de 5 canales."""
    user, jwt_token = user_with_jwt

    request_body = {
        "channel_urls": [
            "https://www.youtube.com/@Channel1",
            "https://www.youtube.com/@Channel2",
            "https://www.youtube.com/@Channel3",
            "https://www.youtube.com/@Channel4",
            "https://www.youtube.com/@Channel5",
            "https://www.youtube.com/@Channel6",  # Sexto canal
        ]
    }

    response = await client.post(
        "/api/v1/discover/youtube/analyze",
        json=request_body,
        headers={"Authorization": f"Bearer {jwt_token}"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_channels_empty_list(client: AsyncClient, user_with_jwt):
    """Test: rechaza lista vacía de canales."""
    user, jwt_token = user_with_jwt

    request_body = {"channel_urls": []}

    response = await client.post(
        "/api/v1/discover/youtube/analyze",
        json=request_body,
        headers={"Authorization": f"Bearer {jwt_token}"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_channels_youtube_api_not_configured(
    client: AsyncClient, user_with_jwt
):
    """Test: devuelve 503 si YOUTUBE_API_KEY no está configurada."""
    user, jwt_token = user_with_jwt

    request_body = {
        "channel_urls": ["https://www.youtube.com/@TheAnimeMan"]
    }

    # Mock: settings sin YOUTUBE_API_KEY
    with patch("app.routers.youtube_discovery.settings") as mock_settings:
        mock_settings.youtube_api_key = ""

        response = await client.post(
            "/api/v1/discover/youtube/analyze",
            json=request_body,
            headers={"Authorization": f"Bearer {jwt_token}"},
        )

    assert response.status_code == 503
    assert "no está disponible" in response.json()["detail"]


@pytest.mark.asyncio
async def test_analyze_channels_service_error(client: AsyncClient, user_with_jwt):
    """Test: maneja errores del servicio correctamente."""
    user, jwt_token = user_with_jwt

    request_body = {
        "channel_urls": ["https://www.youtube.com/@InvalidChannel"]
    }

    # Mock: servicio lanza excepción
    with patch(
        "app.routers.youtube_discovery.YoutubeDiscoveryService.analyze_channels",
        new=AsyncMock(side_effect=Exception("YouTube API error")),
    ):
        response = await client.post(
            "/api/v1/discover/youtube/analyze",
            json=request_body,
            headers={"Authorization": f"Bearer {jwt_token}"},
        )

    assert response.status_code == 500
    assert "Error al analizar canales" in response.json()["detail"]


@pytest.mark.asyncio
async def test_analyze_channels_marks_existing_entries(
    client: AsyncClient, user_with_jwt
):
    """Test: marca correctamente las entradas ya en la colección."""
    user, jwt_token = user_with_jwt

    request_body = {
        "channel_urls": ["https://www.youtube.com/@TheAnimeMan"]
    }

    mock_suggestions = [
        YoutubeSuggestion(
            title="Death Note",
            type="anime",
            mentioned_by="The Anime Man",
            video_title="Test Video",
            video_url="https://www.youtube.com/watch?v=abc123",
            opinion="positive",
            rating=None,
            timestamp=None,
            in_collection=True,  # Ya en colección
            external_url=None,
            cover_image_url=None,
        )
    ]

    mock_metadata = AnalysisMetadata(
        channels_analyzed=1,
        videos_analyzed=10,
        titles_found=1,
        new_suggestions=0,  # Ninguna nueva
        tokens_used=30000,
        analyzed_at=datetime.utcnow(),
    )

    with patch(
        "app.routers.youtube_discovery.YoutubeDiscoveryService.analyze_channels",
        new=AsyncMock(return_value=(mock_suggestions, mock_metadata)),
    ):
        response = await client.post(
            "/api/v1/discover/youtube/analyze",
            json=request_body,
            headers={"Authorization": f"Bearer {jwt_token}"},
        )

    assert response.status_code == 200
    data = response.json()

    assert data["suggestions"][0]["in_collection"] is True
    assert data["metadata"]["new_suggestions"] == 0


@pytest.mark.asyncio
async def test_analyze_channels_multiple_types(client: AsyncClient, user_with_jwt):
    """Test: maneja múltiples tipos de contenido (anime, manga, game)."""
    user, jwt_token = user_with_jwt

    request_body = {
        "channel_urls": ["https://www.youtube.com/@MixedChannel"]
    }

    mock_suggestions = [
        YoutubeSuggestion(
            title="Death Note",
            type="anime",
            mentioned_by="Mixed Channel",
            video_title="Video 1",
            video_url="https://www.youtube.com/watch?v=v1",
            opinion="positive",
            rating=9,
            timestamp=None,
            in_collection=False,
            external_url=None,
            cover_image_url=None,
        ),
        YoutubeSuggestion(
            title="Berserk",
            type="manga",
            mentioned_by="Mixed Channel",
            video_title="Video 2",
            video_url="https://www.youtube.com/watch?v=v2",
            opinion="positive",
            rating=10,
            timestamp=None,
            in_collection=False,
            external_url=None,
            cover_image_url=None,
        ),
        YoutubeSuggestion(
            title="Elden Ring",
            type="game",
            mentioned_by="Mixed Channel",
            video_title="Video 3",
            video_url="https://www.youtube.com/watch?v=v3",
            opinion="positive",
            rating=8,
            timestamp=None,
            in_collection=False,
            external_url=None,
            cover_image_url=None,
        ),
    ]

    mock_metadata = AnalysisMetadata(
        channels_analyzed=1,
        videos_analyzed=15,
        titles_found=3,
        new_suggestions=3,
        tokens_used=50000,
        analyzed_at=datetime.utcnow(),
    )

    with patch(
        "app.routers.youtube_discovery.YoutubeDiscoveryService.analyze_channels",
        new=AsyncMock(return_value=(mock_suggestions, mock_metadata)),
    ):
        response = await client.post(
            "/api/v1/discover/youtube/analyze",
            json=request_body,
            headers={"Authorization": f"Bearer {jwt_token}"},
        )

    assert response.status_code == 200
    data = response.json()

    assert len(data["suggestions"]) == 3
    types = [s["type"] for s in data["suggestions"]]
    assert "anime" in types
    assert "manga" in types
    assert "game" in types
