from unittest.mock import AsyncMock, patch
import pytest
import httpx
from httpx import AsyncClient
from app.models.user import User
from app.schemas.external_search import ExternalSearchResponse
from app.services.external_clients.anilist_client import AniListClient
from app.services.external_clients.rawg_client import RawgClient
from app.services.external_search_service import ExternalSearchService
from tests.factories import make_user, client, override_current_user, clear_overrides


@pytest.fixture
def mock_anilist_client() -> AsyncMock:
    mock = AsyncMock(spec=AniListClient)
    mock.search_anime_manga.return_value = []
    return mock


@pytest.fixture
def mock_rawg_client() -> AsyncMock:
    mock = AsyncMock(spec=RawgClient)
    mock.search_games.return_value = []
    return mock


@pytest.fixture
def test_external_service(mock_anilist_client: AsyncMock, mock_rawg_client: AsyncMock) -> ExternalSearchService:
    return ExternalSearchService(
        anilist_client=mock_anilist_client,
        rawg_client=mock_rawg_client
    )


# Override de dependencia para los tests de integración HTTP
@pytest.fixture
def override_service(test_external_service: ExternalSearchService) -> None:
    from app.core.dependencies import get_external_search_service
    from app.main import app
    app.dependency_overrides[get_external_search_service] = lambda: test_external_service
    yield
    app.dependency_overrides.pop(get_external_search_service, None)


from app.schemas.external_search import ExternalSearchResult, ExternalSearchResponse
from app.models.entry import EntryType


class TestExternalSearchService:
    """Tests unitarios para la lógica del servicio ExternalSearchService."""

    async def test_search_calls_all_clients_concurrently(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_rawg_client: AsyncMock
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
        mock_rawg_client: AsyncMock
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
        mock_rawg_client: AsyncMock
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
        mock_rawg_client: AsyncMock
    ) -> None:
        """Si alguna API devuelve None (fallo) o lanza excepción, el resultado no se almacena en la caché."""
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
        """AniListClient debe reintentar hasta el límite de reintentos ante un 429 y retornar None."""
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
        """AniListClient debe reintentar ante un 429 y si el siguiente intento tiene éxito, retornar los datos."""
        anilist = AniListClient()

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)

        # Primero falla con 429, luego tiene éxito con 200
        mock_response_fail = AsyncMock(spec=httpx.Response)
        mock_response_fail.status_code = 429

        mock_response_ok = AsyncMock(spec=httpx.Response)
        mock_response_ok.status_code = 200
        mock_response_ok.json.return_value = {
            "data": {
                "anime": {"media": [{"title": {"english": "Naruto", "romaji": "Naruto"}, "seasonYear": 2002, "coverImage": {"large": "http://example.com/naruto.jpg"}}]},
                "manga": {"media": []}
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
        assert mock_http_client.post.call_count == 2
        assert mock_sleep.call_count == 1

    @patch("asyncio.sleep", return_value=None)
    async def test_anilist_client_returns_none_on_graphql_errors(self, mock_sleep: AsyncMock) -> None:
        """Si AniList devuelve errores GraphQL sin datos, retornar None."""
        anilist = AniListClient()

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)
        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "errors": [{"message": "Internal server error"}]
        }
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
                        {"title": {"english": "Naruto", "romaji": "Naruto"}, "seasonYear": 2002, "coverImage": {"large": "http://example.com/naruto-anime.jpg"}},
                        {"title": {"english": None, "romaji": "Shingeki no Kyojin"}, "seasonYear": 2013, "coverImage": {"large": "http://example.com/aot.jpg"}},
                    ]
                },
                "manga": {
                    "media": [
                        {"title": {"english": "Naruto", "romaji": "Naruto"}, "startDate": {"year": 1999}, "coverImage": {"large": "http://example.com/naruto-manga.jpg"}},
                    ]
                }
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

        # Segundo anime (fallback a romaji porque english es None)
        assert results[1].title == "Shingeki no Kyojin"
        assert results[1].year == 2013
        assert results[1].type == EntryType.anime

        # Manga
        assert results[2].title == "Naruto"
        assert results[2].year == 1999
        assert results[2].type == EntryType.manga
        assert results[2].source == "AniList"

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
        mock_anilist_client: AsyncMock
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
                source="AniList"
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
