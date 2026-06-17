"""Tests del endpoint de crear entrada (POST /api/v1/entries).

Cobertura: validación de schemas, lógica del servicio e integración HTTP.
Todos los tests usan mocks — no requieren PostgreSQL corriendo.
"""

from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import get_entry_service
from app.core.security import get_current_user
from app.main import app
from app.models.entry import Entry, EntryStatus, EntryType
from app.models.user import User
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import EntryCreate
from app.services.entry_service import EntryService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_entry(
    title: str = "One Piece",
    entry_type: EntryType = EntryType.anime,
    entry_status: EntryStatus = EntryStatus.watching,
    user_id: "UUID | None" = None,
    rating: float | None = None,
    year: int | None = None,
    notes: str | None = None,
    cover_image: str | None = None,
) -> Entry:
    """Crea una instancia de Entry en memoria (sin sesión de BD)."""
    now = datetime.now(timezone.utc)
    return Entry(
        id=uuid4(),
        user_id=user_id or uuid4(),
        title=title,
        type=entry_type,
        status=entry_status,
        rating=rating,
        year=year,
        notes=notes,
        cover_image=cover_image,
        created_at=now,
        updated_at=now,
    )


def _make_user() -> User:
    """Crea una instancia de User en memoria para simular autenticación."""
    from app.core.security import hash_password

    return User(
        id=uuid4(),
        email="test@example.com",
        hashed_password=hash_password("validpass1"),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


from uuid import UUID


@pytest.fixture
def mock_entry_repo() -> AsyncMock:
    return AsyncMock(spec=EntryRepository)


@pytest.fixture
def entry_service(mock_entry_repo: AsyncMock) -> EntryService:
    return EntryService(entry_repo=mock_entry_repo)


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


def _override_current_user(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: user


def _override_entry_service(service: EntryService) -> None:
    app.dependency_overrides[get_entry_service] = lambda: service


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


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
        entry = _make_entry(user_id=user_id)
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
        user = _make_user()
        entry = _make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        _override_current_user(user)
        _override_entry_service(entry_service)

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
            _clear_overrides()

    async def test_create_entry_response_includes_all_fields(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B2: respuesta incluye id, title, type, status, user_id, created_at, updated_at."""
        user = _make_user()
        entry = _make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        _override_current_user(user)
        _override_entry_service(entry_service)

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
            _clear_overrides()

    async def test_create_entry_user_id_from_jwt(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B3: user_id se extrae del JWT, no se acepta en el request."""
        user = _make_user()
        entry = _make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        _override_current_user(user)
        _override_entry_service(entry_service)

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
            _clear_overrides()

    async def test_create_entry_missing_title(
        self, client: AsyncClient
    ) -> None:
        """Criterio B4: falta título → 422."""
        user = _make_user()
        _override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
        finally:
            _clear_overrides()

    async def test_create_entry_empty_title_http(
        self, client: AsyncClient
    ) -> None:
        """Criterio B5: título vacío vía HTTP → 422."""
        user = _make_user()
        _override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
            assert "vacío" in response.json()["detail"]
        finally:
            _clear_overrides()

    async def test_create_entry_whitespace_title_http(
        self, client: AsyncClient
    ) -> None:
        """Criterio B5: título solo espacios vía HTTP → 422."""
        user = _make_user()
        _override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "     ", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
            assert "vacío" in response.json()["detail"]
        finally:
            _clear_overrides()

    async def test_create_entry_title_over_500_chars_http(
        self, client: AsyncClient
    ) -> None:
        """Criterio B6: título > 500 chars vía HTTP → 422."""
        user = _make_user()
        _override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "a" * 501, "type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
            assert "500" in response.json()["detail"]
        finally:
            _clear_overrides()

    async def test_create_entry_invalid_type(
        self, client: AsyncClient
    ) -> None:
        """Criterio B7: tipo inválido → 422."""
        user = _make_user()
        _override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "movie", "status": "watching"},
            )

            assert response.status_code == 422
        finally:
            _clear_overrides()

    async def test_create_entry_invalid_status(
        self, client: AsyncClient
    ) -> None:
        """Criterio B8: estado inválido → 422."""
        user = _make_user()
        _override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "reading"},
            )

            assert response.status_code == 422
        finally:
            _clear_overrides()

    async def test_create_entry_duplicate_http(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B9: duplicado (mismo título + tipo para usuario) vía HTTP → 409."""
        user = _make_user()
        mock_entry_repo.create.side_effect = IntegrityError(
            statement="INSERT INTO entries ...",
            params={},
            orig=Exception('duplicate key value violates unique constraint "uq_entries_user_title_type"'),
        )
        _override_current_user(user)
        _override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 409
            assert "ya tienes" in response.json()["detail"].lower()
        finally:
            _clear_overrides()

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
