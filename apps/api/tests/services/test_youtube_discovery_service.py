"""
Tests para YoutubeDiscoveryService.

Verifica el análisis de canales de YouTube con mocks de:
- YouTube Data API
- youtube-transcript-api
- BedrockClient
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.integrations.bedrock.client import BedrockClient
from app.integrations.youtube.client import YouTubeClient
from app.models.entry import EntryType
from app.repositories.entry_repository import EntryRepository
from app.services.youtube_discovery_service import YoutubeDiscoveryService


@pytest.fixture
def mock_youtube_client():
    """Mock de YouTubeClient."""
    client = MagicMock(spec=YouTubeClient)
    return client


@pytest.fixture
def mock_bedrock_client():
    """Mock de BedrockClient."""
    client = MagicMock(spec=BedrockClient)
    return client


@pytest.fixture
def mock_entry_repo():
    """Mock de EntryRepository."""
    repo = AsyncMock(spec=EntryRepository)
    return repo


@pytest.fixture
def service(mock_youtube_client, mock_bedrock_client, mock_entry_repo):
    """Instancia de YoutubeDiscoveryService con mocks."""
    return YoutubeDiscoveryService(
        youtube_client=mock_youtube_client,
        bedrock_client=mock_bedrock_client,
        entry_repo=mock_entry_repo,
    )


class TestYoutubeDiscoveryService:
    """Tests del servicio de YouTube discovery."""

    @pytest.mark.asyncio
    async def test_analyze_channels_success(
        self,
        service,
        mock_youtube_client,
        mock_bedrock_client,
        mock_entry_repo,
    ):
        """Test: analizar canales exitosamente devuelve sugerencias."""
        user_id = uuid4()
        channel_urls = ["https://www.youtube.com/@TheAnimeMan"]

        # Mock: extract_channel_id
        mock_youtube_client.extract_channel_id.return_value = "UCxxxxxx"

        # Mock: get_channel_info
        mock_youtube_client.get_channel_info.return_value = {
            "id": "UCxxxxxx",
            "title": "The Anime Man",
            "description": "Anime reviews",
            "subscriber_count": "1000000",
            "video_count": "500",
        }

        # Mock: get_recent_videos
        mock_youtube_client.get_recent_videos.return_value = [
            {
                "video_id": "abc123",
                "title": "Top 10 Anime of 2024",
                "description": "My favorite anime this year",
                "published_at": "2024-01-01T00:00:00Z",
                "channel_title": "The Anime Man",
                "url": "https://www.youtube.com/watch?v=abc123",
            }
        ]

        # Mock: get_video_transcript
        mock_youtube_client.get_video_transcript.return_value = (
            "At number one we have Death Note. This anime is phenomenal, "
            "I'd give it a solid 9 out of 10."
        )

        # Mock: Bedrock response
        mock_bedrock_client.invoke_json.return_value = [
            {
                "title": "Death Note",
                "type": "anime",
                "opinion": "positive",
                "rating": 9,
                "timestamp": "5:30",
                "channel_name": "The Anime Man",
                "video_title": "Top 10 Anime of 2024",
                "video_url": "https://www.youtube.com/watch?v=abc123",
            }
        ]

        # Mock: user entries (vacía)
        mock_entry_repo.get_all.return_value = []

        # Ejecutar
        suggestions, metadata = await service.analyze_channels(user_id, channel_urls)

        # Verificar
        assert len(suggestions) == 1
        assert suggestions[0].title == "Death Note"
        assert suggestions[0].type == EntryType.anime
        assert suggestions[0].opinion == "positive"
        assert suggestions[0].rating == 9
        assert suggestions[0].timestamp == "5:30"
        assert suggestions[0].in_collection is False
        assert suggestions[0].mentioned_by == "The Anime Man"

        assert metadata.channels_analyzed == 1
        assert metadata.videos_analyzed == 1
        assert metadata.titles_found == 1
        assert metadata.new_suggestions == 1

    @pytest.mark.asyncio
    async def test_analyze_channels_marks_in_collection(
        self,
        service,
        mock_youtube_client,
        mock_bedrock_client,
        mock_entry_repo,
    ):
        """Test: marca sugerencias que ya están en la colección."""
        user_id = uuid4()
        channel_urls = ["https://www.youtube.com/@TheAnimeMan"]

        # Setup mocks (similar al test anterior)
        mock_youtube_client.extract_channel_id.return_value = "UCxxxxxx"
        mock_youtube_client.get_channel_info.return_value = {
            "id": "UCxxxxxx",
            "title": "The Anime Man",
        }
        mock_youtube_client.get_recent_videos.return_value = [
            {
                "video_id": "abc123",
                "title": "Test Video",
                "description": "Test",
                "published_at": "2024-01-01T00:00:00Z",
                "channel_title": "The Anime Man",
                "url": "https://www.youtube.com/watch?v=abc123",
            }
        ]
        mock_youtube_client.get_video_transcript.return_value = "Death Note is great"

        mock_bedrock_client.invoke_json.return_value = [
            {
                "title": "Death Note",
                "type": "anime",
                "opinion": "positive",
                "rating": None,
                "timestamp": None,
                "channel_name": "The Anime Man",
                "video_title": "Test Video",
                "video_url": "https://www.youtube.com/watch?v=abc123",
            }
        ]

        # Mock: usuario ya tiene Death Note
        mock_entry = MagicMock()
        mock_entry.title = "Death Note"
        mock_entry_repo.get_all.return_value = [mock_entry]

        # Ejecutar
        suggestions, metadata = await service.analyze_channels(user_id, channel_urls)

        # Verificar
        assert len(suggestions) == 1
        assert suggestions[0].in_collection is True
        assert metadata.new_suggestions == 0

    @pytest.mark.asyncio
    async def test_analyze_channels_no_videos(
        self,
        service,
        mock_youtube_client,
        mock_bedrock_client,
        mock_entry_repo,
    ):
        """Test: si no hay vídeos, devuelve metadata vacía."""
        user_id = uuid4()
        channel_urls = ["https://www.youtube.com/@InvalidChannel"]

        mock_youtube_client.extract_channel_id.return_value = None

        suggestions, metadata = await service.analyze_channels(user_id, channel_urls)

        assert len(suggestions) == 0
        assert metadata.channels_analyzed == 0
        assert metadata.videos_analyzed == 0
        assert metadata.titles_found == 0
        assert metadata.new_suggestions == 0

    @pytest.mark.asyncio
    async def test_analyze_channels_transcript_fallback(
        self,
        service,
        mock_youtube_client,
        mock_bedrock_client,
        mock_entry_repo,
    ):
        """Test: si no hay transcript, usa título + descripción."""
        user_id = uuid4()
        channel_urls = ["https://www.youtube.com/@TestChannel"]

        mock_youtube_client.extract_channel_id.return_value = "UCxxxxxx"
        mock_youtube_client.get_channel_info.return_value = {
            "id": "UCxxxxxx",
            "title": "Test Channel",
        }
        mock_youtube_client.get_recent_videos.return_value = [
            {
                "video_id": "abc123",
                "title": "Best Games 2024",
                "description": "My favorite game is Elden Ring",
                "published_at": "2024-01-01T00:00:00Z",
                "channel_title": "Test Channel",
                "url": "https://www.youtube.com/watch?v=abc123",
            }
        ]

        # Sin transcript
        mock_youtube_client.get_video_transcript.return_value = None

        mock_bedrock_client.invoke_json.return_value = [
            {
                "title": "Elden Ring",
                "type": "game",
                "opinion": "positive",
                "rating": None,
                "timestamp": None,
                "channel_name": "Test Channel",
                "video_title": "Best Games 2024",
                "video_url": "https://www.youtube.com/watch?v=abc123",
            }
        ]

        mock_entry_repo.get_all.return_value = []

        suggestions, metadata = await service.analyze_channels(user_id, channel_urls)

        assert len(suggestions) == 1
        assert suggestions[0].title == "Elden Ring"
        assert suggestions[0].type == EntryType.game

    @pytest.mark.asyncio
    async def test_analyze_channels_invalid_mentions(
        self,
        service,
        mock_youtube_client,
        mock_bedrock_client,
        mock_entry_repo,
    ):
        """Test: filtra menciones inválidas de Claude."""
        user_id = uuid4()
        channel_urls = ["https://www.youtube.com/@TestChannel"]

        mock_youtube_client.extract_channel_id.return_value = "UCxxxxxx"
        mock_youtube_client.get_channel_info.return_value = {
            "id": "UCxxxxxx",
            "title": "Test Channel",
        }
        mock_youtube_client.get_recent_videos.return_value = [
            {
                "video_id": "abc123",
                "title": "Test",
                "description": "Test",
                "published_at": "2024-01-01T00:00:00Z",
                "channel_title": "Test Channel",
                "url": "https://www.youtube.com/watch?v=abc123",
            }
        ]
        mock_youtube_client.get_video_transcript.return_value = "Test transcript"

        # Claude devuelve menciones inválidas
        mock_bedrock_client.invoke_json.return_value = [
            # Válida
            {
                "title": "Death Note",
                "type": "anime",
                "opinion": "positive",
                "rating": None,
                "timestamp": None,
                "channel_name": "Test Channel",
                "video_title": "Test",
                "video_url": "https://www.youtube.com/watch?v=abc123",
            },
            # Inválida: tipo incorrecto
            {
                "title": "Invalid",
                "type": "book",
                "opinion": "positive",
                "rating": None,
                "timestamp": None,
                "channel_name": "Test Channel",
                "video_title": "Test",
                "video_url": "https://www.youtube.com/watch?v=abc123",
            },
            # Inválida: falta campo requerido
            {
                "title": "Invalid 2",
                "type": "anime",
                # falta opinion
                "channel_name": "Test Channel",
                "video_title": "Test",
                "video_url": "https://www.youtube.com/watch?v=abc123",
            },
        ]

        mock_entry_repo.get_all.return_value = []

        suggestions, metadata = await service.analyze_channels(user_id, channel_urls)

        # Solo la válida debe pasar
        assert len(suggestions) == 1
        assert suggestions[0].title == "Death Note"

    @pytest.mark.asyncio
    async def test_analyze_channels_multiple_channels(
        self,
        service,
        mock_youtube_client,
        mock_bedrock_client,
        mock_entry_repo,
    ):
        """Test: analiza múltiples canales correctamente."""
        user_id = uuid4()
        channel_urls = [
            "https://www.youtube.com/@Channel1",
            "https://www.youtube.com/@Channel2",
        ]

        # Mock para dos canales diferentes
        def extract_channel_id_side_effect(url):
            if "Channel1" in url:
                return "UC1"
            elif "Channel2" in url:
                return "UC2"
            return None

        mock_youtube_client.extract_channel_id.side_effect = extract_channel_id_side_effect

        def get_channel_info_side_effect(channel_id):
            if channel_id == "UC1":
                return {"id": "UC1", "title": "Channel 1"}
            elif channel_id == "UC2":
                return {"id": "UC2", "title": "Channel 2"}
            return None

        mock_youtube_client.get_channel_info.side_effect = get_channel_info_side_effect

        def get_recent_videos_side_effect(channel_id, max_results):
            if channel_id == "UC1":
                return [
                    {
                        "video_id": "v1",
                        "title": "Video 1",
                        "description": "Test",
                        "published_at": "2024-01-01T00:00:00Z",
                        "channel_title": "Channel 1",
                        "url": "https://www.youtube.com/watch?v=v1",
                    }
                ]
            elif channel_id == "UC2":
                return [
                    {
                        "video_id": "v2",
                        "title": "Video 2",
                        "description": "Test",
                        "published_at": "2024-01-01T00:00:00Z",
                        "channel_title": "Channel 2",
                        "url": "https://www.youtube.com/watch?v=v2",
                    }
                ]
            return []

        mock_youtube_client.get_recent_videos.side_effect = get_recent_videos_side_effect
        mock_youtube_client.get_video_transcript.return_value = "Test transcript"

        mock_bedrock_client.invoke_json.return_value = [
            {
                "title": "Anime 1",
                "type": "anime",
                "opinion": "positive",
                "rating": None,
                "timestamp": None,
                "channel_name": "Channel 1",
                "video_title": "Video 1",
                "video_url": "https://www.youtube.com/watch?v=v1",
            },
            {
                "title": "Anime 2",
                "type": "anime",
                "opinion": "positive",
                "rating": None,
                "timestamp": None,
                "channel_name": "Channel 2",
                "video_title": "Video 2",
                "video_url": "https://www.youtube.com/watch?v=v2",
            },
        ]

        mock_entry_repo.get_all.return_value = []

        suggestions, metadata = await service.analyze_channels(user_id, channel_urls)

        assert len(suggestions) == 2
        assert metadata.channels_analyzed == 2
        assert metadata.videos_analyzed == 2


class TestFormatSuggestionsAsText:
    """Tests del formateador de sugerencias a texto legible."""

    def _suggestion(self, title="Death Note", in_collection=False) -> object:
        from app.schemas.youtube_discovery import YoutubeSuggestion

        return YoutubeSuggestion(
            title=title,
            type=EntryType.anime,
            mentioned_by="The Anime Man",
            video_title="Top 10",
            video_url="https://www.youtube.com/watch?v=abc123",
            opinion="positive",
            rating=9,
            timestamp=None,
            in_collection=in_collection,
            external_url=None,
            cover_image_url=None,
        )

    def test_empty_suggestions(self) -> None:
        text = YoutubeDiscoveryService.format_suggestions_as_text([])
        assert "No encontré menciones" in text

    def test_formats_suggestion(self) -> None:
        text = YoutubeDiscoveryService.format_suggestions_as_text([self._suggestion()])
        assert "Death Note" in text
        assert "The Anime Man" in text
        assert "nuevo" in text

    def test_marks_in_collection(self) -> None:
        text = YoutubeDiscoveryService.format_suggestions_as_text(
            [self._suggestion(in_collection=True)]
        )
        assert "ya en tu lista" in text
