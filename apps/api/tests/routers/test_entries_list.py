"""Tests del endpoint de listar entradas (GET /api/v1/entries/).

Cobertura: integración HTTP con dependencias mockeadas.
No requiere PostgreSQL corriendo.
"""

from unittest.mock import AsyncMock

from httpx import AsyncClient

from app.models.entry import EntryType
from app.schemas.entry import SortField, SortOrder
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
# Tests de integración HTTP — endpoint GET /api/v1/entries/ con dependencias mockeadas
# ---------------------------------------------------------------------------


class TestListEntriesEndpoint:
    """Tests del endpoint GET /api/v1/entries/ vía HTTP."""

    async def test_list_entries_success(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L1: GET retorna 200 OK con entradas del usuario autenticado."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.get_all.return_value = [entry]
        mock_entry_repo.count.return_value = 1
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get("/api/v1/entries/")

            assert response.status_code == 200
            body = response.json()
            assert len(body["entries"]) == 1
            assert body["entries"][0]["title"] == "One Piece"
            assert body["total"] == 1
            assert body["page"] == 1
            assert body["limit"] == 15
            assert body["total_pages"] == 1
        finally:
            clear_overrides()

    async def test_list_entries_excludes_user_id(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio de diseño: el listado no expone user_id."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.get_all.return_value = [entry]
        mock_entry_repo.count.return_value = 1
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get("/api/v1/entries/")

            assert response.status_code == 200
            body = response.json()
            assert "user_id" not in body["entries"][0]
        finally:
            clear_overrides()

    async def test_list_entries_filter_by_type(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L2: filtro por type mediante query param."""
        user = make_user()
        entry = make_entry(user_id=user.id, entry_type=EntryType.game)
        mock_entry_repo.get_all.return_value = [entry]
        mock_entry_repo.count.return_value = 1
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get("/api/v1/entries/?type=game")

            assert response.status_code == 200
            body = response.json()
            assert body["entries"][0]["type"] == "game"
            mock_entry_repo.get_all.assert_awaited_once_with(
                user_id=user.id,
                entry_type=EntryType.game,
                search=None,
                sort_by=SortField.created_at,
                sort_order=SortOrder.desc,
                limit=15,
                offset=0,
            )
        finally:
            clear_overrides()

    async def test_list_entries_pagination(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L3: paginación funciona mediante query params."""
        user = make_user()
        mock_entry_repo.get_all.return_value = []
        mock_entry_repo.count.return_value = 30
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get("/api/v1/entries/?page=2&limit=10")

            assert response.status_code == 200
            body = response.json()
            assert body["page"] == 2
            assert body["limit"] == 10
            assert body["total_pages"] == 3
            mock_entry_repo.get_all.assert_awaited_once_with(
                user_id=user.id,
                entry_type=None,
                search=None,
                sort_by=SortField.created_at,
                sort_order=SortOrder.desc,
                limit=10,
                offset=10,
            )
        finally:
            clear_overrides()

    async def test_list_entries_empty_returns_200(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L6: lista vacía retorna 200 OK con metadatos correctos."""
        user = make_user()
        mock_entry_repo.get_all.return_value = []
        mock_entry_repo.count.return_value = 0
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get("/api/v1/entries/")

            assert response.status_code == 200
            body = response.json()
            assert body["entries"] == []
            assert body["total"] == 0
            assert body["total_pages"] == 0
        finally:
            clear_overrides()

    async def test_list_entries_invalid_type_returns_422(
        self, client: AsyncClient
    ) -> None:
        """type inválido debe retornar 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.get("/api/v1/entries/?type=movie")

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_list_entries_invalid_page_returns_422(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """page < 1 debe retornar 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get("/api/v1/entries/?page=0")

            assert response.status_code == 422
            assert "page" in response.json()["detail"].lower()
            mock_entry_repo.get_all.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_list_entries_invalid_limit_returns_422(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """limit fuera de rango debe retornar 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get("/api/v1/entries/?limit=101")

            assert response.status_code == 422
            assert "limit" in response.json()["detail"].lower()
            mock_entry_repo.get_all.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_list_entries_filter_by_search(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """El endpoint HTTP permite filtrar por texto a través del parámetro search."""
        user = make_user()
        entry = make_entry(user_id=user.id, title="Naruto Shippuden")
        mock_entry_repo.get_all.return_value = [entry]
        mock_entry_repo.count.return_value = 1
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get("/api/v1/entries/?search=Naruto")

            assert response.status_code == 200
            body = response.json()
            assert len(body["entries"]) == 1
            assert body["entries"][0]["title"] == "Naruto Shippuden"
            mock_entry_repo.get_all.assert_awaited_once_with(
                user_id=user.id,
                entry_type=None,
                search="Naruto",
                sort_by=SortField.created_at,
                sort_order=SortOrder.desc,
                limit=15,
                offset=0,
            )
        finally:
            clear_overrides()

    async def test_list_entries_filter_by_sorting(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """El endpoint HTTP acepta los parámetros query sort_by y sort_order."""
        user = make_user()
        mock_entry_repo.get_all.return_value = []
        mock_entry_repo.count.return_value = 0
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get("/api/v1/entries/?sort_by=title&sort_order=asc")

            assert response.status_code == 200
            mock_entry_repo.get_all.assert_awaited_once_with(
                user_id=user.id,
                entry_type=None,
                search=None,
                sort_by=SortField.title,
                sort_order=SortOrder.asc,
                limit=15,
                offset=0,
            )
        finally:
            clear_overrides()

    async def test_list_entries_requires_authentication(
        self, client: AsyncClient
    ) -> None:
        """Criterio L7: endpoint requiere autenticación (sin token → 401)."""
        response = await client.get("/api/v1/entries/")

        assert response.status_code == 401
