"""Tests de validación de schemas para configuración de progreso.

Cobertura: compatibilidad tipo-unidad y coherencia de valores.
"""

import pytest
from pydantic import ValidationError

from app.models.entry import EntryStatus, EntryType
from app.models.enums import ProgressUnit
from app.schemas.entry import EntryCreate, EntryUpdate


class TestEntryCreateProgressValidation:
    """Validaciones de progreso en el schema de creación."""

    def _create(
        self,
        entry_type: EntryType,
        unit: ProgressUnit | None = None,
        total: int | None = None,
    ) -> EntryCreate:
        return EntryCreate(
            title="Test",
            type=entry_type,
            status=EntryStatus.watching,
            progress_unit=unit,
            progress_total=total,
        )

    def test_anime_with_episodes_is_valid(self) -> None:
        entry = self._create(EntryType.anime, ProgressUnit.episodes, 12)
        assert entry.progress_unit == ProgressUnit.episodes
        assert entry.progress_total == 12

    def test_anime_with_chapters_is_invalid(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            self._create(EntryType.anime, ProgressUnit.chapters)
        assert "episodes" in str(exc_info.value).lower()

    def test_manga_with_chapters_is_valid(self) -> None:
        entry = self._create(EntryType.manga, ProgressUnit.chapters, 100)
        assert entry.progress_unit == ProgressUnit.chapters

    def test_manga_with_volumes_is_invalid(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            self._create(EntryType.manga, ProgressUnit.volumes, 20)
        assert "chapters" in str(exc_info.value).lower()

    def test_manga_with_episodes_is_invalid(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            self._create(EntryType.manga, ProgressUnit.episodes)
        assert "chapters" in str(exc_info.value).lower()

    def test_game_with_hours_is_valid(self) -> None:
        entry = self._create(EntryType.game, ProgressUnit.hours, 40.5)
        assert entry.progress_unit == ProgressUnit.hours

    def test_game_with_hours_decimal_total_is_valid(self) -> None:
        entry = self._create(EntryType.game, ProgressUnit.hours, 40.5)
        assert entry.progress_total == 40.5

    def test_game_with_minutes_is_invalid(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            self._create(EntryType.game, ProgressUnit.minutes, 120)
        assert "hours" in str(exc_info.value).lower()

    def test_game_with_percentage_is_invalid(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            self._create(EntryType.game, ProgressUnit.percentage, 100)
        assert "hours" in str(exc_info.value).lower()

    def test_game_with_episodes_is_invalid(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            self._create(EntryType.game, ProgressUnit.episodes)
        error_message = str(exc_info.value).lower()
        assert "hours" in error_message

    def test_anime_total_must_be_integer(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            self._create(EntryType.anime, ProgressUnit.episodes, 12.5)
        assert "entero" in str(exc_info.value).lower()

    def test_manga_total_must_be_integer(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            self._create(EntryType.manga, ProgressUnit.chapters, 100.5)
        assert "entero" in str(exc_info.value).lower()

    def test_game_total_can_be_decimal(self) -> None:
        entry = self._create(EntryType.game, ProgressUnit.hours, 40.5)
        assert entry.progress_total == 40.5

    def test_progress_total_can_be_null(self) -> None:
        entry = self._create(EntryType.anime, ProgressUnit.episodes, None)
        assert entry.progress_total is None

    def test_negative_progress_total_is_invalid(self) -> None:
        with pytest.raises(ValidationError):
            self._create(EntryType.anime, ProgressUnit.episodes, -1)


class TestEntryUpdateProgressValidation:
    """Validaciones de progreso en el schema de actualización."""

    def test_valid_type_and_unit_combination(self) -> None:
        data = EntryUpdate(type=EntryType.manga, progress_unit=ProgressUnit.chapters)
        assert data.type == EntryType.manga
        assert data.progress_unit == ProgressUnit.chapters

    def test_invalid_type_and_unit_combination(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            EntryUpdate(type=EntryType.anime, progress_unit=ProgressUnit.chapters)
        assert "episodes" in str(exc_info.value).lower()

    def test_current_progress_cannot_exceed_total(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            EntryUpdate(current_progress=10, progress_total=5)
        assert "total" in str(exc_info.value).lower()

    def test_negative_current_progress_is_invalid(self) -> None:
        with pytest.raises(ValidationError):
            EntryUpdate(current_progress=-1)

    def test_negative_progress_total_is_invalid(self) -> None:
        with pytest.raises(ValidationError):
            EntryUpdate(progress_total=-1)
