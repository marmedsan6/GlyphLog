"""Tests de validación de schemas Pydantic para EntryCreate.

Cobertura: validación directa de campos obligatorios y opcionales (sin HTTP ni servicio).
"""

import pytest
from pydantic import ValidationError

from app.models.entry import EntryStatus, EntryType
from app.schemas.entry import EntryCreate

# ---------------------------------------------------------------------------
# Tests de schema — campos obligatorios
# ---------------------------------------------------------------------------


class TestEntryCreateSchema:
    """Validaciones de Pydantic sobre el schema EntryCreate."""

    def test_title_trim_applied(self) -> None:
        """Criterio B10: el título se almacena con trim() aplicado."""
        data = EntryCreate(title="  One Piece  ", type=EntryType.anime, status=EntryStatus.watching)
        assert data.title == "One Piece"

    def test_title_empty_raises(self) -> None:
        """Criterio B5: título vacío → ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            EntryCreate(title="", type=EntryType.anime, status=EntryStatus.watching)
        assert "vacío" in str(exc_info.value)

    def test_title_whitespace_only_raises(self) -> None:
        """Criterio B5: título solo espacios → ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            EntryCreate(title="     ", type=EntryType.anime, status=EntryStatus.watching)
        assert "vacío" in str(exc_info.value)

    def test_title_over_500_chars_raises(self) -> None:
        """Criterio B6: título > 500 chars → ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            EntryCreate(title="a" * 501, type=EntryType.anime, status=EntryStatus.watching)
        assert "500" in str(exc_info.value)

    def test_title_exactly_500_chars_is_valid(self) -> None:
        """Criterio B6: título de exactamente 500 chars debe ser válido (boundary)."""
        data = EntryCreate(title="a" * 500, type=EntryType.anime, status=EntryStatus.watching)
        assert data.title == "a" * 500

    def test_valid_entry_create(self) -> None:
        """Un EntryCreate con datos válidos se construye sin errores."""
        data = EntryCreate(title="One Piece", type=EntryType.anime, status=EntryStatus.watching)
        assert data.title == "One Piece"
        assert data.type == EntryType.anime
        assert data.status == EntryStatus.watching


# ---------------------------------------------------------------------------
# Tests de schema — campos opcionales
# ---------------------------------------------------------------------------


class TestEntryCreateOptionalFieldsSchema:
    """Validaciones de Pydantic sobre campos opcionales de EntryCreate."""

    # ── Rating ────────────────────────────────────────────────────────────

    def test_rating_valid_values(self) -> None:
        """Rating acepta valores dentro del rango [1.0, 10.0]."""
        for value in (1.0, 5.5, 10.0):
            data = EntryCreate(
                title="One Piece",
                type=EntryType.anime,
                status=EntryStatus.watching,
                rating=value,
            )
            assert data.rating == value

    def test_rating_below_minimum_raises(self) -> None:
        """Rating < 1.0 → ValidationError."""
        with pytest.raises(ValidationError):
            EntryCreate(
                title="One Piece",
                type=EntryType.anime,
                status=EntryStatus.watching,
                rating=0.5,
            )

    def test_rating_above_maximum_raises(self) -> None:
        """Rating > 10.0 → ValidationError."""
        with pytest.raises(ValidationError):
            EntryCreate(
                title="One Piece",
                type=EntryType.anime,
                status=EntryStatus.watching,
                rating=10.1,
            )

    def test_rating_none_is_valid(self) -> None:
        """Rating como None es válido (campo opcional)."""
        data = EntryCreate(
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.watching,
            rating=None,
        )
        assert data.rating is None

    # ── Year ──────────────────────────────────────────────────────────────

    def test_year_valid_values(self) -> None:
        """Year acepta valores dentro del rango [1950, 2100]."""
        for value in (1950, 2024, 2100):
            data = EntryCreate(
                title="One Piece",
                type=EntryType.anime,
                status=EntryStatus.watching,
                year=value,
            )
            assert data.year == value

    def test_year_below_minimum_raises(self) -> None:
        """Year < 1950 → ValidationError."""
        with pytest.raises(ValidationError):
            EntryCreate(
                title="One Piece",
                type=EntryType.anime,
                status=EntryStatus.watching,
                year=1949,
            )

    def test_year_above_maximum_raises(self) -> None:
        """Year > 2100 → ValidationError."""
        with pytest.raises(ValidationError):
            EntryCreate(
                title="One Piece",
                type=EntryType.anime,
                status=EntryStatus.watching,
                year=2101,
            )

    def test_year_none_is_valid(self) -> None:
        """Year como None es válido (campo opcional)."""
        data = EntryCreate(
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.watching,
            year=None,
        )
        assert data.year is None

    # ── Notes ─────────────────────────────────────────────────────────────

    def test_notes_valid_text(self) -> None:
        """Notes acepta texto dentro del límite de 5000 caracteres."""
        data = EntryCreate(
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.watching,
            notes="Una gran aventura",
        )
        assert data.notes == "Una gran aventura"

    def test_notes_exactly_5000_chars_is_valid(self) -> None:
        """Notes de exactamente 5000 caracteres debe ser válido (boundary)."""
        data = EntryCreate(
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.watching,
            notes="a" * 5000,
        )
        assert data.notes == "a" * 5000

    def test_notes_over_5000_chars_raises(self) -> None:
        """Notes > 5000 caracteres → ValidationError."""
        with pytest.raises(ValidationError):
            EntryCreate(
                title="One Piece",
                type=EntryType.anime,
                status=EntryStatus.watching,
                notes="a" * 5001,
            )

    def test_notes_trimmed(self) -> None:
        """Notes se almacena con trim() aplicado."""
        data = EntryCreate(
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.watching,
            notes="  texto con espacios  ",
        )
        assert data.notes == "texto con espacios"

    def test_notes_none_is_valid(self) -> None:
        """Notes como None es válido (campo opcional)."""
        data = EntryCreate(
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.watching,
            notes=None,
        )
        assert data.notes is None

    # ── Todos los opcionales ──────────────────────────────────────────────

    def test_all_optionals_none_is_valid(self) -> None:
        """Todos los campos opcionales como None → entrada válida."""
        data = EntryCreate(
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.watching,
        )
        assert data.rating is None
        assert data.year is None
        assert data.notes is None
        assert data.cover_image is None

    def test_all_optionals_set_is_valid(self) -> None:
        """Todos los campos opcionales con valores válidos → entrada válida."""
        data = EntryCreate(
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.watching,
            rating=8.5,
            year=1999,
            notes="Clásico del anime",
            cover_image="/uploads/covers/test.jpg",
        )
        assert data.rating == 8.5
        assert data.year == 1999
        assert data.notes == "Clásico del anime"
        assert data.cover_image == "/uploads/covers/test.jpg"
