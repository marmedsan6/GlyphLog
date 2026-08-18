from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResult, GamePlaytimeResponse
from app.services.external_search_service import ExternalSearchService
from tests.factories import clear_overrides, make_user, override_current_user


@pytest.fixture
def mock_anilist_client() -> AsyncMock:
    from app.integrations.anilist_client import AniListClient

    mock = AsyncMock(spec=AniListClient)
    mock.search_anime_manga.return_value = []
    return mock


@pytest.fixture
def mock_igdb_client() -> AsyncMock:
    from app.integrations.igdb_client import IgdbClient

    mock = AsyncMock(spec=IgdbClient)
    mock.search_games.return_value = []
    return mock


@pytest.fixture
def mock_hltb_client() -> AsyncMock:
    from app.integrations.hltb_client import HltbClient

    mock = AsyncMock(spec=HltbClient)
    return mock


@pytest.fixture
def test_external_service(
    mock_anilist_client: AsyncMock,
    mock_igdb_client: AsyncMock,
    mock_hltb_client: AsyncMock,
) -> ExternalSearchService:
    return ExternalSearchService(
        anilist_client=mock_anilist_client,
        igdb_client=mock_igdb_client,
        hltb_client=mock_hltb_client,
    )


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

    async def test_search_accepts_type_param(
        self,
        client: AsyncClient,
        override_service: None,
        mock_anilist_client: AsyncMock,
    ) -> None:
        """El endpoint propaga el parámetro type y valida contra EntryType."""
        user = make_user()
        override_current_user(user)
        mock_anilist_client.search_by_type.return_value = [
            ExternalSearchResult(
                title="Berserk", type=EntryType.manga, source="AniList"
            )
        ]

        try:
            response = await client.get("/api/v1/external/search?q=berserk&type=manga")
            assert response.status_code == 200
            body = response.json()
            assert len(body["results"]) == 1
            assert body["results"][0]["type"] == "manga"
            mock_anilist_client.search_by_type.assert_called_once()
        finally:
            clear_overrides()

    async def test_search_rejects_invalid_type(
        self, client: AsyncClient
    ) -> None:
        """Un type que no es anime|manga|game debe rechazarse con 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.get("/api/v1/external/search?q=berserk&type=foo")
            assert response.status_code == 422
        finally:
            clear_overrides()


class TestExternalGamePlaytimeEndpoint:
    """Tests de integración HTTP para el endpoint /external/games/playtime."""

    async def test_requires_authentication(self, client: AsyncClient) -> None:
        """Sin token → 401."""
        response = await client.get("/api/v1/external/games/playtime?title=witcher")
        assert response.status_code == 401

    async def test_returns_playtime_on_success(
        self,
        client: AsyncClient,
        override_service: None,
        mock_hltb_client: AsyncMock,
    ) -> None:
        """Con usuario autenticado y resultado de HLTB → 200 con playtime_hours."""
        user = make_user()
        override_current_user(user)
        mock_hltb_client.get_main_story_hours.return_value = GamePlaytimeResponse(
            title="Witcher 3", playtime_hours=Decimal("51.69")
        )

        try:
            response = await client.get(
                "/api/v1/external/games/playtime?title=Witcher%203"
            )
            assert response.status_code == 200
            body = response.json()
            assert body["title"] == "Witcher 3"
            assert body["playtime_hours"] == "51.69"
        finally:
            clear_overrides()

    async def test_returns_none_when_not_found(
        self,
        client: AsyncClient,
        override_service: None,
        mock_hltb_client: AsyncMock,
    ) -> None:
        """HLTB no encuentra el juego → 200 con playtime None (degradación elegante)."""
        user = make_user()
        override_current_user(user)
        mock_hltb_client.get_main_story_hours.return_value = GamePlaytimeResponse(
            title="Unknown Game", playtime_hours=None
        )

        try:
            response = await client.get(
                "/api/v1/external/games/playtime?title=Unknown%20Game"
            )
            assert response.status_code == 200
            body = response.json()
            assert body["title"] == "Unknown Game"
            assert body["playtime_hours"] is None
        finally:
            clear_overrides()

    async def test_rejects_empty_title(self, client: AsyncClient) -> None:
        """Título vacío → 400."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.get("/api/v1/external/games/playtime?title=")
            assert response.status_code == 400
        finally:
            clear_overrides()
