"""Tests de campos opcionales (rating, year, notes, cover_image) en entradas.

Cobertura: validación de schemas, integración HTTP con multipart/form-data
y subida de imágenes. Todos los tests usan mocks — no requieren PostgreSQL.
"""

import io
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from pydantic import ValidationError

from app.models.entry import EntryStatus, EntryType
from app.schemas.entry import EntryCreate
from app.services.entry_service import EntryService
from tests.factories import (
    clear_overrides,
    client,  # noqa: F401  # fixture compartido
    entry_service,  # noqa: F401  # fixture compartido
    make_entry,
    make_user,
    mock_entry_repo,  # noqa: F401  # fixture compartido
    override_current_user,
    override_entry_service,
)

# ---------------------------------------------------------------------------
# Tests de schema — validación directa de campos opcionales en EntryCreate
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


# ---------------------------------------------------------------------------
# Tests de integración HTTP — campos opcionales vía multipart/form-data
# ---------------------------------------------------------------------------


class TestCreateEntryOptionalFieldsHTTP:
    """Tests HTTP de campos opcionales en POST /api/v1/entries."""

    async def test_create_with_all_optional_fields(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Crear entrada con todos los opcionales → 201 + campos en respuesta."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            rating=8.5,
            year=1999,
            notes="Clásico del anime",
            cover_image="/uploads/covers/test.jpg",
        )
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                    "rating": "8.5",
                    "year": "1999",
                    "notes": "Clásico del anime",
                },
            )

            assert response.status_code == 201
            body = response.json()
            assert body["rating"] == 8.5
            assert body["year"] == 1999
            assert body["notes"] == "Clásico del anime"
            assert body["cover_image"] == "/uploads/covers/test.jpg"
        finally:
            clear_overrides()

    async def test_create_without_optional_fields(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Crear entrada sin opcionales → 201 + campos null en respuesta."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                },
            )

            assert response.status_code == 201
            body = response.json()
            assert body["rating"] is None
            assert body["year"] is None
            assert body["notes"] is None
            assert body["cover_image"] is None
        finally:
            clear_overrides()

    async def test_create_with_cover_image(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Crear entrada con imagen → 201 + cover_image tiene ruta relativa."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            cover_image="/uploads/covers/abc123.jpg",
        )
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            with patch("app.routers.entries.save_cover_image", new_callable=AsyncMock) as mock_save:
                mock_save.return_value = "/uploads/covers/abc123.jpg"

                response = await client.post(
                    "/api/v1/entries/",
                    data={
                        "title": "One Piece",
                        "type": "anime",
                        "status": "watching",
                    },
                    files={
                        "cover_image": (
                            "test.jpg",
                            io.BytesIO(b"fake image data"),
                            "image/jpeg",
                        )
                    },
                )

            assert response.status_code == 201
            body = response.json()
            assert body["cover_image"] == "/uploads/covers/abc123.jpg"
            mock_save.assert_awaited_once()
        finally:
            clear_overrides()

    async def test_create_with_image_over_5mb(
        self, client: AsyncClient, entry_service: EntryService
    ) -> None:
        """Imagen > 5MB → 422 con mensaje de error descriptivo."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            # 6MB de datos — supera el límite de 5MB.
            # Se usan magic bytes JPEG válidos para que la validación de formato
            # pase y la comprobación de tamaño sea la que rechace la petición.
            large_content = b"\xff\xd8\xff" + b"x" * (6 * 1024 * 1024)

            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                },
                files={
                    "cover_image": (
                        "large.jpg",
                        io.BytesIO(large_content),
                        "image/jpeg",
                    )
                },
            )

            assert response.status_code == 422
            assert "5MB" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_with_invalid_image_mime(
        self, client: AsyncClient, entry_service: EntryService
    ) -> None:
        """Imagen con MIME inválido → 422 (validación de tipo MIME)."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                },
                files={
                    "cover_image": (
                        "test.txt",
                        io.BytesIO(b"not an image"),
                        "text/plain",
                    )
                },
            )

            assert response.status_code == 422
            assert "no válido" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_with_spoofed_mime(
        self, client: AsyncClient, entry_service: EntryService
    ) -> None:
        """Archivo no-imagen con Content-Type: image/jpeg → 422 (magic bytes lo detectan)."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)
        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "watching"},
                files={"cover_image": ("evil.jpg", io.BytesIO(b"<script>alert(1)</script>"), "image/jpeg")},
            )
            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_with_rating_out_of_range(
        self, client: AsyncClient
    ) -> None:
        """Rating fuera de rango vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                    "rating": "10.5",
                },
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_with_year_out_of_range(
        self, client: AsyncClient
    ) -> None:
        """Year fuera de rango vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                    "year": "2101",
                },
            )

            assert response.status_code == 422
        finally:
            clear_overrides()
