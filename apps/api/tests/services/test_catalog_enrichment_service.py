"""Tests del CatalogEnrichmentService (match por título+tipo, fallback [])."""

from unittest.mock import AsyncMock

from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResponse, ExternalSearchResult
from app.services.catalog_enrichment_service import CatalogEnrichmentService
from app.services.external_search_service import ExternalSearchService


class TestCatalogEnrichmentService:
    def make_service(self, results: list[ExternalSearchResult]):
        external = AsyncMock(spec=ExternalSearchService)
        external.search.return_value = ExternalSearchResponse(results=results)
        return CatalogEnrichmentService(external)

    async def test_returns_genres_on_title_and_type_match(self) -> None:
        service = self.make_service(
            [
                ExternalSearchResult(
                    title="One Piece",
                    type=EntryType.anime,
                    source="AniList",
                    genres=["Action", "Adventure"],
                )
            ]
        )

        genres = await service.find_genres("One Piece", EntryType.anime)

        assert genres == ["Action", "Adventure"]

    async def test_passes_entry_type_to_search(self) -> None:
        """find_genres debe pasar entry_type a search para no consultar RAWG en anime/manga."""
        external = AsyncMock(spec=ExternalSearchService)
        external.search.return_value = ExternalSearchResponse(
            results=[
                ExternalSearchResult(
                    title="One Piece",
                    type=EntryType.anime,
                    source="AniList",
                    genres=["Action"],
                )
            ]
        )
        service = CatalogEnrichmentService(external)

        await service.find_genres("One Piece", EntryType.anime)

        external.search.assert_called_once_with("One Piece", entry_type=EntryType.anime)

    async def test_find_enrichment_returns_cover_image(self) -> None:
        """find_enrichment devuelve genres + cover_image cuando hay match."""
        external = AsyncMock(spec=ExternalSearchService)
        external.search.return_value = ExternalSearchResponse(
            results=[
                ExternalSearchResult(
                    title="One Piece",
                    type=EntryType.anime,
                    source="AniList",
                    genres=["Action", "Adventure"],
                    cover_image="https://anilist.co/cover/one-piece.jpg",
                )
            ]
        )
        service = CatalogEnrichmentService(external)

        enrichment = await service.find_enrichment("One Piece", EntryType.anime)

        assert enrichment.genres == ["Action", "Adventure"]
        assert enrichment.cover_image == "https://anilist.co/cover/one-piece.jpg"

    async def test_find_enrichment_empty_on_no_match(self) -> None:
        """Sin match, find_enrichment devuelve valores vacíos."""
        external = AsyncMock(spec=ExternalSearchService)
        external.search.return_value = ExternalSearchResponse(results=[])
        service = CatalogEnrichmentService(external)

        enrichment = await service.find_enrichment("One Piece", EntryType.anime)

        assert enrichment.genres == []
        assert enrichment.cover_image is None

    async def test_returns_empty_on_no_match(self) -> None:
        service = self.make_service(
            [
                ExternalSearchResult(
                    title="Otro título",
                    type=EntryType.anime,
                    source="AniList",
                    genres=["Action"],
                )
            ]
        )

        genres = await service.find_genres("One Piece", EntryType.anime)

        assert genres == []

    async def test_returns_empty_on_error(self) -> None:
        external = AsyncMock(spec=ExternalSearchService)
        external.search.side_effect = Exception("Red caída")
        service = CatalogEnrichmentService(external)

        genres = await service.find_genres("One Piece", EntryType.anime)

        assert genres == []
