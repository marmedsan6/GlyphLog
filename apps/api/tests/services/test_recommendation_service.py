"""Tests unitarios del RecommendationService (géneros y prompt).

No se hacen llamadas reales a ningún LLM ni catálogo externo: se mockean el
cliente LLM, el repositorio de entradas y el servicio de búsqueda externa.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.models.entry import EntryStatus, EntryType
from app.services.recommendation_service import (
    InsufficientCollectionError,
    RecommendationService,
)
from tests.factories import make_entry


@pytest.fixture
def service() -> tuple[RecommendationService, AsyncMock, AsyncMock]:
    llm = AsyncMock()
    repo = AsyncMock()
    external = AsyncMock()
    return RecommendationService(llm, repo, external), repo, external


def _entry(title: str, rating: float, genres: list[str] | None) -> object:
    return make_entry(
        title=title,
        entry_type=EntryType.anime,
        entry_status=EntryStatus.completed,
        rating=rating,
        genres=genres,
    )


class TestCalculateFavoriteGenres:
    def test_returns_genres_sorted_by_frequency_then_name(self) -> None:
        entries = [
            _entry("A", 9, ["Action", "Drama"]),
            _entry("B", 8, ["Action"]),
            _entry("C", 7, ["Drama"]),
        ]
        result = RecommendationService._calculate_favorite_genres(entries)
        # Action (2) y Drama (2) empatan en frecuencia → orden alfabético.
        assert result == ["Action", "Drama"]

    def test_skips_none_genres(self) -> None:
        entries = [_entry("A", 9, ["Action"]), _entry("B", 8, None)]
        assert RecommendationService._calculate_favorite_genres(entries) == ["Action"]

    def test_empty_when_no_genres(self) -> None:
        entries = [_entry("A", 9, None), _entry("B", 8, [])]
        assert RecommendationService._calculate_favorite_genres(entries) == []


class TestBuildPrompt:
    def test_prompt_includes_genres_and_favorite_genres(self, service) -> None:
        recommendation_service, _, _ = service
        entries = [
            _entry("Attack on Titan", 9, ["Action", "Drama"]),
            _entry("Steins;Gate", 8, ["Sci-Fi", "Thriller"]),
        ]
        prompt = recommendation_service._build_recommendation_prompt(
            entries, limit=5, entry_type=EntryType.anime, favorite_genres=["Action", "Sci-Fi"]
        )
        assert "Attack on Titan" in prompt
        assert "genres: Action, Drama" in prompt
        assert "Favorite genres: Action, Sci-Fi" in prompt

    def test_prompt_handles_no_favorite_genres(self, service) -> None:
        recommendation_service, _, _ = service
        prompt = recommendation_service._build_recommendation_prompt(
            [_entry("A", 9, None)],
            limit=5,
            entry_type=None,
            favorite_genres=[],
        )
        assert "Favorite genres: (none detected)" in prompt


class TestGenerateRecommendationsStrict:
    async def test_strict_raises_when_fewer_than_5_entries(self, service) -> None:
        recommendation_service, repo, _ = service
        repo.list_by_user.return_value = [_entry(f"E{i}", 9, None) for i in range(4)]

        with pytest.raises(InsufficientCollectionError):
            await recommendation_service.generate_recommendations(
                user_id=uuid4(), entry_type=EntryType.anime, limit=5, strict=True
            )

    async def test_strict_raises_when_no_entries_of_type(self, service) -> None:
        recommendation_service, repo, _ = service
        repo.list_by_user.return_value = [
            make_entry(
                title=f"M{i}",
                entry_type=EntryType.manga,
                entry_status=EntryStatus.completed,
                rating=8,
            )
            for i in range(6)
        ]

        with pytest.raises(InsufficientCollectionError):
            await recommendation_service.generate_recommendations(
                user_id=uuid4(), entry_type=EntryType.anime, limit=5, strict=True
            )
