from decimal import Decimal
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResult
from app.integrations.anilist_client import AniListClient
from app.integrations.hltb_client import HltbClient
from app.integrations.igdb_client import IgdbClient
from app.services.external_search_service import ExternalSearchService


@pytest.fixture
def mock_anilist_client() -> AsyncMock:
    mock = AsyncMock(spec=AniListClient)
    mock.search_anime_manga.return_value = []
    return mock


@pytest.fixture
def mock_igdb_client() -> AsyncMock:
    mock = AsyncMock(spec=IgdbClient)
    mock.search_games.return_value = []
    return mock


@pytest.fixture
def mock_hltb_client() -> AsyncMock:
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


class TestExternalSearchService:
    """Tests unitarios para la lógica del servicio ExternalSearchService."""

    async def test_search_calls_all_clients_concurrently(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_igdb_client: AsyncMock,
    ) -> None:
        mock_anilist_client.search_anime_manga.return_value = [
            ExternalSearchResult(title="Anime result", type=EntryType.anime, source="AniList"),
            ExternalSearchResult(title="Manga result", type=EntryType.manga, source="AniList"),
        ]
        mock_igdb_client.search_games.return_value = [
            ExternalSearchResult(title="Game result", type=EntryType.game, source="IGDB")
        ]

        response = await test_external_service.search("one piece")

        assert len(response.results) == 3
        mock_anilist_client.search_anime_manga.assert_called_once()
        mock_igdb_client.search_games.assert_called_once()

    async def test_search_memory_cache_works(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
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

    async def test_search_by_type_anime_only_queries_anilist_anime(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_igdb_client: AsyncMock,
    ) -> None:
        """Con type=anime solo se consulta AniList (anime), nunca IGDB ni manga."""
        mock_anilist_client.search_by_type.return_value = [
            ExternalSearchResult(title="Naruto", type=EntryType.anime, source="AniList")
        ]

        response = await test_external_service.search("naruto", EntryType.anime)

        assert len(response.results) == 1
        assert response.results[0].type == EntryType.anime
        mock_anilist_client.search_by_type.assert_called_once()
        mock_anilist_client.search_anime_manga.assert_not_called()
        mock_igdb_client.search_games.assert_not_called()

    async def test_search_by_type_game_only_queries_igdb(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_igdb_client: AsyncMock,
    ) -> None:
        """Con type=game solo se consulta IGDB, nunca AniList."""
        mock_igdb_client.search_games.return_value = [
            ExternalSearchResult(title="Witcher 3", type=EntryType.game, source="IGDB")
        ]

        response = await test_external_service.search("witcher", EntryType.game)

        assert len(response.results) == 1
        assert response.results[0].type == EntryType.game
        mock_igdb_client.search_games.assert_called_once()
        mock_anilist_client.search_by_type.assert_not_called()
        mock_anilist_client.search_anime_manga.assert_not_called()

    async def test_search_by_type_uses_type_in_cache_key(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
    ) -> None:
        """La misma query con distinto type no comparte caché."""
        mock_anilist_client.search_anime_manga.return_value = []
        mock_anilist_client.search_by_type.return_value = []

        await test_external_service.search("naruto")
        assert mock_anilist_client.search_anime_manga.call_count == 1

        await test_external_service.search("naruto", EntryType.anime)
        # El tipo cambia la clave de caché, así que vuelve a consultar.
        assert mock_anilist_client.search_by_type.call_count == 1

    async def test_search_resilient_to_failures(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_igdb_client: AsyncMock,
    ) -> None:
        """Si un cliente lanza una excepción, los demás siguen devolviendo resultados."""
        mock_anilist_client.search_anime_manga.side_effect = Exception("AniList API down")
        mock_igdb_client.search_games.return_value = [
            ExternalSearchResult(title="Witcher 3", type=EntryType.game, source="IGDB")
        ]

        response = await test_external_service.search("witcher")

        assert len(response.results) == 1
        assert response.results[0].title == "Witcher 3"

    async def test_search_failures_are_not_cached(
        self,
        test_external_service: ExternalSearchService,
        mock_anilist_client: AsyncMock,
        mock_igdb_client: AsyncMock,
    ) -> None:
        """Los fallos no se guardan en la caché positiva, pero sí en la negativa (TTL 60s).

        Tras un fallo (None), la siguiente búsqueda de la misma key devuelve
        vacío desde la caché negativa sin re-attemptar.
        """
        mock_anilist_client.search_anime_manga.return_value = None
        mock_igdb_client.search_games.return_value = []

        # Primera consulta: llama a las APIs y falla
        await test_external_service.search("naruto")
        assert mock_anilist_client.search_anime_manga.call_count == 1

        # Segunda consulta: caché negativa → no re-attempta
        await test_external_service.search("naruto")
        assert mock_anilist_client.search_anime_manga.call_count == 1

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
    async def test_anilist_client_respects_retry_after_header(
        self, mock_sleep: AsyncMock
    ) -> None:
        """AniListClient usa Retry-After header como delay cuando está presente."""
        anilist = AniListClient()

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)

        # 429 con Retry-After: 3, luego 200
        mock_response_fail = AsyncMock(spec=httpx.Response)
        mock_response_fail.status_code = 429
        mock_response_fail.headers = {"Retry-After": "3"}

        mock_response_ok = AsyncMock(spec=httpx.Response)
        mock_response_ok.status_code = 200
        mock_response_ok.json.return_value = {
            "data": {"anime": {"media": []}, "manga": {"media": []}}
        }

        mock_http_client.post.side_effect = [mock_response_fail, mock_response_ok]

        results = await anilist.search_anime_manga(mock_http_client, "naruto")

        assert results is not None
        assert mock_http_client.post.call_count == 2
        assert mock_sleep.call_count == 1
        # El delay debe ser >= 3.0 (Retry-After) + jitter (0–0.5)
        sleep_delay = mock_sleep.call_args[0][0]
        assert sleep_delay >= 3.0

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

        assert results[0].title == "Naruto"
        assert results[0].year == 2002
        assert results[0].type == EntryType.anime
        assert results[0].source == "AniList"
        assert results[0].progress_total == Decimal("220")

        assert results[1].title == "Shingeki no Kyojin"
        assert results[1].year == 2013
        assert results[1].type == EntryType.anime
        assert results[1].progress_total == Decimal("75")

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

    async def test_anilist_client_search_by_type_parses_single_type(self) -> None:
        """search_by_type parsea solo el tipo solicitado (anime o manga)."""
        anilist = AniListClient()

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)
        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "Page": {
                    "media": [
                        {
                            "title": {"english": "Berserk", "romaji": "Berserk"},
                            "startDate": {"year": 1989},
                            "chapters": 380,
                            "coverImage": {"large": "http://example.com/berserk.jpg"},
                        },
                    ]
                }
            }
        }
        mock_http_client.post.return_value = mock_response

        results = await anilist.search_by_type(mock_http_client, "berserk", EntryType.manga)

        assert results is not None
        assert len(results) == 1
        assert results[0].title == "Berserk"
        assert results[0].type == EntryType.manga
        assert results[0].progress_total == Decimal("380")


class TestIgdbClient:
    """Tests del IgdbClient (búsqueda de videojuegos)."""

    @patch("app.integrations.igdb_client.IgdbClient._get_access_token")
    async def test_search_games_not_configured(self, mock_token: AsyncMock) -> None:
        """Sin credenciales, retorna [] sin llamar a la API."""
        igdb = IgdbClient(client_id="", client_secret="")
        mock_client = AsyncMock(spec=httpx.AsyncClient)

        result = await igdb.search_games(mock_client, "zelda")

        assert result == []
        mock_client.post.assert_not_called()
        mock_token.assert_not_called()

    @patch("app.integrations.igdb_client.IgdbClient._get_access_token")
    async def test_search_games_parses_results(self, mock_token: AsyncMock) -> None:
        """Parsea name, year, cover y genres de una respuesta IGDB."""
        mock_token.return_value = "test-token"
        igdb = IgdbClient(client_id="id", client_secret="secret")
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "name": "The Legend of Zelda",
                "slug": "the-legend-of-zelda",
                "first_release_date": 509328000,  # 1986-02-21
                "genres": [{"id": 31, "name": "Adventure"}],
                "cover": {"id": 86202, "image_id": "co1uii"},
            }
        ]
        mock_client.post.return_value = mock_response

        result = await igdb.search_games(mock_client, "zelda")

        assert result is not None
        assert len(result) == 1
        assert result[0].title == "The Legend of Zelda"
        assert result[0].year == 1986
        assert result[0].type == EntryType.game
        assert result[0].source == "IGDB"
        assert result[0].slug == "the-legend-of-zelda"
        assert result[0].genres == ["Adventure"]
        assert result[0].cover_image == (
            "https://images.igdb.com/igdb/image/upload/t_cover_big/co1uii.jpg"
        )

    @patch("app.integrations.igdb_client.IgdbClient._get_access_token")
    async def test_search_games_returns_none_on_error(self, mock_token: AsyncMock) -> None:
        """Un error de red devuelve None."""
        mock_token.return_value = "test-token"
        igdb = IgdbClient(client_id="id", client_secret="secret")
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.side_effect = httpx.ConnectTimeout("timeout")

        result = await igdb.search_games(mock_client, "zelda")

        assert result is None


class TestExternalSearchServiceGamePlaytime:
    """Tests del método get_game_playtime de ExternalSearchService."""

    async def test_get_game_playtime_caches_result(
        self,
        test_external_service: ExternalSearchService,
        mock_hltb_client: AsyncMock,
    ) -> None:
        """La segunda llamada al mismo título usa caché y no llama a HLTB de nuevo."""
        mock_hltb_client.get_main_story_hours.return_value = type(
            "Resp", (), {"title": "Witcher 3", "playtime_hours": Decimal("51.69")}
        )()

        result1 = await test_external_service.get_game_playtime("Witcher 3")
        result2 = await test_external_service.get_game_playtime("Witcher 3")

        assert result1.title == "Witcher 3"
        assert result1.playtime_hours == Decimal("51.69")
        assert result2 == result1
        mock_hltb_client.get_main_story_hours.assert_called_once()

    async def test_get_game_playtime_none_playtime(
        self,
        test_external_service: ExternalSearchService,
        mock_hltb_client: AsyncMock,
    ) -> None:
        """HLTB devuelve None playtime → playtime_hours None."""
        from app.schemas.external_search import GamePlaytimeResponse

        mock_hltb_client.get_main_story_hours.return_value = GamePlaytimeResponse(
            title="Some Game", playtime_hours=None
        )

        result = await test_external_service.get_game_playtime("Some Game")

        assert result.playtime_hours is None
