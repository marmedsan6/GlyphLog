from unittest.mock import AsyncMock

import httpx
import pytest
from httpx import AsyncClient

from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResult
from app.services.external_search_service import ExternalSearchService
from tests.factories import clear_overrides, make_user, override_current_user


@pytest.fixture
def mock_anilist_client() -> AsyncMock:
    from app.integrations.anilist_client import AniListClient

    mock = AsyncMock(spec=AniListClient)
    mock.search_anime_manga.return_value = []
    return mock


@pytest.fixture
def mock_rawg_client() -> AsyncMock:
    from app.integrations.rawg_client import RawgClient

    mock = AsyncMock(spec=RawgClient)
    mock.search_games.return_value = []
    mock.get_game_detail.return_value = None
    return mock


@pytest.fixture
def test_external_service(
    mock_anilist_client: AsyncMock, mock_rawg_client: AsyncMock
) -> ExternalSearchService:
    return ExternalSearchService(anilist_client=mock_anilist_client, rawg_client=mock_rawg_client)


@pytest.fixture
def override_service(test_external_service: ExternalSearchService) -> None:
    from app.core.dependencies import get_external_search_service
    from app.main import app

    app.dependency_overrides[get_external_search_service] = lambda: test_external_service
    yield
    app.dependency_overrides.pop(get_external_search_service, None)


class TestExternalSearchEndpoint:
    """Tests de integración HTTP para el router external_search."""

    async def test_search_requires_authentication(self, client: AsyncClient) -> None:
        """Endpoint requiere autenticación (sin token -> 401)."""
        response = await client.get("/api/v1/external/search?q=one+piece")
        assert response.status_code == 401

    async def test_search_validates_min_length(self, client: AsyncClient) -> None:
        """Query muy corta (< 3 caracteres) retorna 400 Bad Request."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.get("/api/v1/external/search?q=ab")
            assert response.status_code == 400
            assert "al menos 3 caracteres" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_search_success_returns_results(
        self,
        client: AsyncClient,
        override_service: None,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
    ) -> None:
        """Búsqueda válida con usuario autenticado retorna resultados unificados."""
        user = make_user()
        override_current_user(user)

        mock_anilist_client.search_anime_manga.return_value = [
            ExternalSearchResult(
                title="Naruto",
                year=2002,
                cover_image="http://example.com/naruto.jpg",
                type=EntryType.anime,
                source="AniList",
            )
        ]

        try:
            response = await client.get("/api/v1/external/search?q=naruto")
            assert response.status_code == 200
            body = response.json()
            assert "results" in body
            assert len(body["results"]) == 1
            assert body["results"][0]["title"] == "Naruto"
            assert body["results"][0]["type"] == "anime"
        finally:
            clear_overrides()


class TestExternalGameDetailEndpoint:
    """Tests de integración HTTP para el endpoint /external/games/{slug}."""

    async def test_requires_authentication(self, client: AsyncClient) -> None:
        """Sin token → 401."""
        response = await client.get("/api/v1/external/games/witcher-3")
        assert response.status_code == 401

    async def test_returns_playtime_on_success(
        self,
        client: AsyncClient,
        override_service: None,
        test_external_service: ExternalSearchService,
        mock_rawg_client: AsyncMock,
    ) -> None:
        """Con usuario autenticado y resultado de RAWG → 200 con playtime_hours."""
        user = make_user()
        override_current_user(user)
        mock_rawg_client.get_game_detail.return_value = {"playtime": 8}

        try:
            response = await client.get("/api/v1/external/games/witcher-3")
            assert response.status_code == 200
            body = response.json()
            assert body["slug"] == "witcher-3"
            assert body["playtime_raw"] == 8
            assert body["playtime_hours"] == "8.00"
        finally:
            clear_overrides()

    async def test_returns_none_when_not_found(
        self,
        client: AsyncClient,
        override_service: None,
        test_external_service: ExternalSearchService,
        mock_rawg_client: AsyncMock,
    ) -> None:
        """RAWG no encuentra el juego → 200 con playtime None (degradación elegante)."""
        user = make_user()
        override_current_user(user)
        mock_rawg_client.get_game_detail.return_value = None

        try:
            response = await client.get("/api/v1/external/games/unknown-slug")
            assert response.status_code == 200
            body = response.json()
            assert body["slug"] == "unknown-slug"
            assert body["playtime_raw"] is None
            assert body["playtime_hours"] is None
        finally:
            clear_overrides()
