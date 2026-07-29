from decimal import Decimal
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import AsyncClient

from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResult
from app.services.external_clients.anilist_client import AniListClient
from app.services.external_clients.rawg_client import RawgClient, _playtime_to_hours
from app.services.external_search_service import ExternalSearchService
from tests.factories import clear_overrides, make_user, override_current_user


@pytest.fixture
def mock_anilist_client() -> AsyncMock:
    mock = AsyncMock(spec=AniListClient)
    mock.search_anime_manga.return_value = []
    return mock


@pytest.fixture
def mock_rawg_client() -> AsyncMock:
    mock = AsyncMock(spec=RawgClient)
    mock.search_games.return_value = []
    mock.get_game_detail.return_value = None
    return mock


@pytest.fixture
def test_external_service(
    mock_anilist_client: AsyncMock, mock_rawg_client: AsyncMock
) -> ExternalSearchService:
    return ExternalSearchService(anilist_client=mock_anilist_client, rawg_client=mock_rawg_client)


# Override de dependencia para los tests de integración HTTP
@pytest.fixture
def override_service(test_external_service: ExternalSearchService) -> None:
    from app.core.dependencies import get_external_search_service
    from app.main import app

    app.dependency_overrides[get_external_search_service] = lambda: test_external_service
    yield
    app.dependency_overrides.pop(get_external_search_service, None)


class TestExternalSearchService:
    """Tests unitarios para la lógica del servicio ExternalSearchService."""

    async def test_search_calls_all_clients_concurrently(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_rawg_client: AsyncMock,
    ) -> None:
        mock_anilist_client.search_anime_manga.return_value = [
            ExternalSearchResult(title="Anime result", type=EntryType.anime, source="AniList"),
            ExternalSearchResult(title="Manga result", type=EntryType.manga, source="AniList"),
        ]
        mock_rawg_client.search_games.return_value = [
            ExternalSearchResult(title="Game result", type=EntryType.game, source="RAWG")
        ]

        response = await test_external_service.search("one piece")

        assert len(response.results) == 3
        mock_anilist_client.search_anime_manga.assert_called_once()
        mock_rawg_client.search_games.assert_called_once()

    async def test_search_memory_cache_works(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_rawg_client: AsyncMock,
    ) -> None:
        """La segunda búsqueda idéntica debe retornar de la caché y no llamar a los clientes."""
        mock_anilist_client.search_anime_manga.return_value = []

        # Primera consulta
        await test_external_service.search("naruto")
        assert mock_anilist_client.search_anime_manga.call_count == 1

        # Segunda consulta (mismo término)
        await test_external_service.search("naruto")
        # El contador no debe subir porque lee de caché
        assert mock_anilist_client.search_anime_manga.call_count == 1

    async def test_search_resilient_to_failures(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_rawg_client: AsyncMock,
    ) -> None:
        """Si un cliente lanza una excepción, los demás siguen devolviendo resultados."""
        mock_anilist_client.search_anime_manga.side_effect = Exception("AniList API down")
        mock_rawg_client.search_games.return_value = [
            ExternalSearchResult(title="Witcher 3", type=EntryType.game, source="RAWG")
        ]

        response = await test_external_service.search("witcher")

        assert len(response.results) == 1
        assert response.results[0].title == "Witcher 3"

    async def test_search_failures_are_not_cached(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_rawg_client: AsyncMock,
    ) -> None:
        """Si alguna API falla (None o excepción), el resultado no se almacena en caché."""
        # Configurar para que retorne None (fallo)
        mock_anilist_client.search_anime_manga.return_value = None
        mock_rawg_client.search_games.return_value = []

        # Primera consulta
        await test_external_service.search("naruto")
        assert mock_anilist_client.search_anime_manga.call_count == 1

        # Segunda consulta
        await test_external_service.search("naruto")
        # Debería haber llamado de nuevo porque no se guardó en la caché
        assert mock_anilist_client.search_anime_manga.call_count == 2

    @patch("asyncio.sleep", return_value=None)
    async def test_anilist_client_retries_on_429(self, mock_sleep: AsyncMock) -> None:
        """AniListClient reintenta ante 429 y retorna None al agotar intentos."""
        anilist = AniListClient()

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)
        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 429
        mock_http_client.post.return_value = mock_response

        results = await anilist.search_anime_manga(mock_http_client, "naruto")

        assert results is None
        # Se debe haber intentado 3 veces en total (1 inicial + 2 reintentos)
        assert mock_http_client.post.call_count == 3
        assert mock_sleep.call_count == 2

    @patch("asyncio.sleep", return_value=None)
    async def test_anilist_client_retries_and_succeeds(self, mock_sleep: AsyncMock) -> None:
        """AniListClient reintenta ante 429 y devuelve datos si el siguiente intento funciona."""
        anilist = AniListClient()

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)

        # Primero falla con 429, luego tiene éxito con 200
        mock_response_fail = AsyncMock(spec=httpx.Response)
        mock_response_fail.status_code = 429

        mock_response_ok = AsyncMock(spec=httpx.Response)
        mock_response_ok.status_code = 200
        mock_response_ok.json.return_value = {
            "data": {
                "anime": {
                    "media": [
                        {
                            "title": {"english": "Naruto", "romaji": "Naruto"},
                            "seasonYear": 2002,
                            "episodes": 220,
                            "coverImage": {"large": "http://example.com/naruto.jpg"},
                        }
                    ]
                },
                "manga": {"media": []},
            }
        }

        mock_http_client.post.side_effect = [mock_response_fail, mock_response_ok]

        results = await anilist.search_anime_manga(mock_http_client, "naruto")

        assert results is not None
        assert len(results) == 1
        assert results[0].title == "Naruto"
        assert results[0].year == 2002
        assert results[0].type == EntryType.anime
        assert results[0].source == "AniList"
        assert results[0].progress_total == Decimal("220")
        assert mock_http_client.post.call_count == 2
        assert mock_sleep.call_count == 1

    @patch("asyncio.sleep", return_value=None)
    async def test_anilist_client_returns_none_on_graphql_errors(
        self, mock_sleep: AsyncMock
    ) -> None:
        """Si AniList devuelve errores GraphQL sin datos, retornar None."""
        anilist = AniListClient()

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)
        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"errors": [{"message": "Internal server error"}]}
        mock_http_client.post.return_value = mock_response

        results = await anilist.search_anime_manga(mock_http_client, "naruto")

        assert results is None

    async def test_anilist_client_parses_combined_anime_manga(self) -> None:
        """AniListClient debe parsear correctamente una respuesta combinada de anime + manga."""
        anilist = AniListClient()

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)
        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "anime": {
                    "media": [
                        {
                            "title": {"english": "Naruto", "romaji": "Naruto"},
                            "seasonYear": 2002,
                            "episodes": 220,
                            "coverImage": {"large": "http://example.com/naruto-anime.jpg"},
                        },
                        {
                            "title": {"english": None, "romaji": "Shingeki no Kyojin"},
                            "seasonYear": 2013,
                            "episodes": 75,
                            "coverImage": {"large": "http://example.com/aot.jpg"},
                        },
                    ]
                },
                "manga": {
                    "media": [
                        {
                            "title": {"english": "Naruto", "romaji": "Naruto"},
                            "startDate": {"year": 1999},
                            "chapters": 700,
                            "coverImage": {"large": "http://example.com/naruto-manga.jpg"},
                        },
                    ]
                },
            }
        }
        mock_http_client.post.return_value = mock_response

        results = await anilist.search_anime_manga(mock_http_client, "naruto")

        assert results is not None
        assert len(results) == 3

        # Primer anime
        assert results[0].title == "Naruto"
        assert results[0].year == 2002
        assert results[0].type == EntryType.anime
        assert results[0].source == "AniList"
        assert results[0].progress_total == Decimal("220")

        # Segundo anime (fallback a romaji porque english es None)
        assert results[1].title == "Shingeki no Kyojin"
        assert results[1].year == 2013
        assert results[1].type == EntryType.anime
        assert results[1].progress_total == Decimal("75")

        # Manga
        assert results[2].title == "Naruto"
        assert results[2].year == 1999
        assert results[2].type == EntryType.manga
        assert results[2].source == "AniList"
        assert results[2].progress_total == Decimal("700")

    async def test_anilist_client_returns_none_on_network_error(self) -> None:
        """AniListClient retorna None si ocurre un error de red."""
        anilist = AniListClient()

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)
        mock_http_client.post.side_effect = httpx.ConnectTimeout("Connection timed out")

        results = await anilist.search_anime_manga(mock_http_client, "naruto")

        assert results is None


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


class TestPlaytimeToHours:
    """Tests del helper _playtime_to_hours para conversión de RAWG."""

    def test_none_returns_none(self) -> None:
        assert _playtime_to_hours(None) is None

    def test_zero_returns_none(self) -> None:
        assert _playtime_to_hours(0) is None

    def test_int_converts_to_decimal_with_2_decimals(self) -> None:
        result = _playtime_to_hours(8)
        assert result == Decimal("8.00")
        assert isinstance(result, Decimal)

    def test_large_value(self) -> None:
        result = _playtime_to_hours(120)
        assert result == Decimal("120.00")


class TestRawgClientDetail:
    """Tests del método get_game_detail de RawgClient."""

    async def test_get_game_detail_no_api_key(self) -> None:
        """Si no hay API key, retorna None sin hacer la petición."""
        rawg = RawgClient(api_key="")
        mock_client = AsyncMock(spec=httpx.AsyncClient)

        result = await rawg.get_game_detail(mock_client, "some-slug")

        assert result is None
        mock_client.get.assert_not_called()

    async def test_get_game_detail_success(self) -> None:
        """Retorna dict con playtime cuando RAWG devuelve 200."""
        rawg = RawgClient(api_key="test-key")
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"playtime": 12}
        mock_client.get.return_value = mock_response

        result = await rawg.get_game_detail(mock_client, "witcher-3")

        assert result == {"playtime": 12}
        mock_client.get.assert_called_once()

    async def test_get_game_detail_not_found(self) -> None:
        """404 devuelve None."""
        rawg = RawgClient(api_key="test-key")
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 404
        mock_client.get.return_value = mock_response

        result = await rawg.get_game_detail(mock_client, "unknown-slug")

        assert result is None

    async def test_get_game_detail_network_error(self) -> None:
        """Errores de red eventualmente devuelven None."""
        rawg = RawgClient(api_key="test-key")
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.side_effect = httpx.ConnectTimeout("timeout")

        result = await rawg.get_game_detail(mock_client, "any-slug")

        assert result is None


class TestExternalSearchServiceGameDetail:
    """Tests del método get_game_detail de ExternalSearchService."""

    async def test_get_game_detail_caches_result(
        self, test_external_service: ExternalSearchService, mock_rawg_client: AsyncMock
    ) -> None:
        """La segunda llamada al mismo slug usa caché y no llama a RAWG de nuevo."""
        mock_rawg_client.get_game_detail.return_value = {"playtime": 12}

        result1 = await test_external_service.get_game_detail("witcher-3")
        result2 = await test_external_service.get_game_detail("witcher-3")

        assert result1.slug == "witcher-3"
        assert result1.playtime_raw == 12
        assert result1.playtime_hours == Decimal("12.00")
        assert result2 == result1
        mock_rawg_client.get_game_detail.assert_called_once()

    async def test_get_game_detail_none_playtime(
        self, test_external_service: ExternalSearchService, mock_rawg_client: AsyncMock
    ) -> None:
        """RAWG devuelve None playtime → playtime_hours None."""
        mock_rawg_client.get_game_detail.return_value = {"playtime": None}

        result = await test_external_service.get_game_detail("some-game")

        assert result.playtime_raw is None
        assert result.playtime_hours is None

    async def test_get_game_detail_api_failure(
        self, test_external_service: ExternalSearchService, mock_rawg_client: AsyncMock
    ) -> None:
        """Si RAWG falla (retorna None), se cachea respuesta vacía para no reintentar."""
        mock_rawg_client.get_game_detail.return_value = None

        result1 = await test_external_service.get_game_detail("test-slug")
        result2 = await test_external_service.get_game_detail("test-slug")

        assert result1.playtime_raw is None
        assert result1.playtime_hours is None
        assert result2.playtime_raw is None
        mock_rawg_client.get_game_detail.assert_called_once()


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
