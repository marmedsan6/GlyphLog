"""Tests del endpoint de crear entrada (POST /api/v1/entries).

Cobertura: validación de schemas, lógica del servicio e integración HTTP.
Todos los tests usan mocks — no requieren PostgreSQL corriendo.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.models.entry import EntryStatus, EntryType
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import EntryCreate
from app.services.entry_service import EntryService
from tests.factories import (
    make_entry,
    make_user,
    mock_entry_repo,  # noqa: F401  # fixture compartido
    entry_service,  # noqa: F401  # fixture compartido
    client,  # noqa: F401  # fixture compartido
    override_current_user,
    override_entry_service,
    clear_overrides,
)


# ---------------------------------------------------------------------------
# Tests de schema — validación directa de EntryCreate (sin HTTP ni servicio)
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
# Tests del servicio — EntryService.create() con repositorio mockeado
# ---------------------------------------------------------------------------


class TestEntryServiceCreate:
    """Lógica de negocio de crear entrada en EntryService."""

    async def test_create_success(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Crear entrada válida retorna EntryResponse con los datos correctos."""
        user_id = uuid4()
        entry = make_entry(user_id=user_id)
        mock_entry_repo.create.return_value = entry

        data = EntryCreate(title="One Piece", type=EntryType.anime, status=EntryStatus.watching)
        result = await entry_service.create(user_id=user_id, data=data)

        assert result.title == entry.title
        assert result.type == entry.type
        assert result.status == entry.status
        assert result.user_id == user_id
        mock_entry_repo.create.assert_awaited_once_with(user_id, data)

    async def test_create_duplicate_raises_409(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B9: duplicado (mismo título + tipo) → IntegrityError → 409."""
        mock_entry_repo.create.side_effect = IntegrityError(
            statement="INSERT INTO entries ...",
            params={},
            orig=Exception('duplicate key value violates unique constraint "uq_entries_user_title_type"'),
        )

        data = EntryCreate(title="One Piece", type=EntryType.anime, status=EntryStatus.watching)
        with pytest.raises(HTTPException) as exc_info:
            await entry_service.create(user_id=uuid4(), data=data)
        assert exc_info.value.status_code == 409
        assert "ya tienes" in exc_info.value.detail.lower()


# ---------------------------------------------------------------------------
# Tests de integración HTTP — endpoint POST /api/v1/entries con dependencias mockeadas
# ---------------------------------------------------------------------------


class TestCreateEntryEndpoint:
    """Tests del endpoint POST /api/v1/entries vía HTTP."""

    async def test_create_entry_success(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B1: POST retorna 201 Created con datos correctos."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 201
            body = response.json()
            assert body["title"] == "One Piece"
            assert body["type"] == "anime"
            assert body["status"] == "watching"
        finally:
            clear_overrides()

    async def test_create_entry_response_includes_all_fields(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B2: respuesta incluye id, title, type, status, user_id, created_at, updated_at."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 201
            body = response.json()
            assert "id" in body
            assert "title" in body
            assert "type" in body
            assert "status" in body
            assert "user_id" in body
            assert "rating" in body
            assert "year" in body
            assert "notes" in body
            assert "cover_image" in body
            assert "created_at" in body
            assert "updated_at" in body
        finally:
            clear_overrides()

    async def test_create_entry_user_id_from_jwt(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B3: user_id se extrae del JWT, no se acepta en el request."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            # Enviar user_id en el body debe ser ignorado (no está en EntryCreate schema)
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                    "user_id": str(uuid4()),  # Este user_id debe ignorarse
                },
            )

            assert response.status_code == 201
            body = response.json()
            # El user_id en la respuesta debe ser el del usuario autenticado
            assert body["user_id"] == str(user.id)
        finally:
            clear_overrides()

    async def test_create_entry_missing_title(
        self, client: AsyncClient
    ) -> None:
        """Criterio B4: falta título → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_entry_empty_title_http(
        self, client: AsyncClient
    ) -> None:
        """Criterio B5: título vacío vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
            assert "vacío" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_entry_whitespace_title_http(
        self, client: AsyncClient
    ) -> None:
        """Criterio B5: título solo espacios vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "     ", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
            assert "vacío" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_entry_title_over_500_chars_http(
        self, client: AsyncClient
    ) -> None:
        """Criterio B6: título > 500 chars vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "a" * 501, "type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
            assert "500" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_entry_invalid_type(
        self, client: AsyncClient
    ) -> None:
        """Criterio B7: tipo inválido → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "movie", "status": "watching"},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_entry_invalid_status(
        self, client: AsyncClient
    ) -> None:
        """Criterio B8: estado inválido → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "reading"},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_entry_duplicate_http(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B9: duplicado (mismo título + tipo para usuario) vía HTTP → 409."""
        user = make_user()
        mock_entry_repo.create.side_effect = IntegrityError(
            statement="INSERT INTO entries ...",
            params={},
            orig=Exception('duplicate key value violates unique constraint "uq_entries_user_title_type"'),
        )
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 409
            assert "ya tienes" in response.json()["detail"].lower()
        finally:
            clear_overrides()

    async def test_create_entry_requires_authentication(
        self, client: AsyncClient
    ) -> None:
        """Criterio B11: endpoint requiere autenticación (sin token → 401)."""
        # NO mockeamos get_current_user — la dependencia real debe ejecutarse
        # y fallar al no encontrar header Authorization.
        response = await client.post(
            "/api/v1/entries/",
            data={"title": "One Piece", "type": "anime", "status": "watching"},
        )

        assert response.status_code == 401
