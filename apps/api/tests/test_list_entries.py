"""Tests del endpoint de listar entradas (GET /api/v1/entries/).

Cobertura: lógica del servicio e integración HTTP.
Todos los tests usan mocks — no requieren PostgreSQL corriendo.
"""

from datetime import datetime, timezone
from math import ceil
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.models.entry import EntryStatus, EntryType
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import (
    EntryListItem,
    PaginatedEntryResponse,
    SortField,
    SortOrder,
)
from app.services.entry_service import InvalidPaginationError, EntryService
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
# Helpers
# ---------------------------------------------------------------------------


def _build_paginated_response(
    entries: list[EntryListItem],
    page: int = 1,
    limit: int = 15,
) -> PaginatedEntryResponse:
    """Construye la respuesta paginada esperada a partir de ítems de listado."""
    total = len(entries)
    return PaginatedEntryResponse(
        entries=entries,
        total=total,
        page=page,
        limit=limit,
        total_pages=ceil(total / limit) if total > 0 else 0,
    )


# ---------------------------------------------------------------------------
# Tests del servicio — EntryService.get_all() con repositorio mockeado
# ---------------------------------------------------------------------------


class TestEntryServiceGetAll:
    """Lógica de negocio de listar entradas en EntryService."""

    async def test_get_all_returns_paginated_entries(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L1: usuario autenticado recibe sus entradas paginadas."""
        user_id = uuid4()
        entry = make_entry(user_id=user_id)
        mock_entry_repo.get_all.return_value = [entry]
        mock_entry_repo.count.return_value = 1

        result = await entry_service.get_all(user_id=user_id)

        assert isinstance(result, PaginatedEntryResponse)
        assert len(result.entries) == 1
        assert result.entries[0].title == entry.title
        assert result.entries[0].type == entry.type
        assert result.total == 1
        assert result.page == 1
        assert result.limit == 15
        assert result.total_pages == 1
        mock_entry_repo.get_all.assert_awaited_once_with(
            user_id=user_id,
            entry_type=None,
            search=None,
            sort_by=SortField.created_at,
            sort_order=SortOrder.desc,
            limit=15,
            offset=0,
        )
        mock_entry_repo.count.assert_awaited_once_with(user_id=user_id, entry_type=None, search=None)

    async def test_get_all_is_filtered_by_user_id(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L7: un usuario nunca ve entradas de otro usuario (aislamiento)."""
        user_id = uuid4()
        other_user_id = uuid4()
        mock_entry_repo.get_all.return_value = []
        mock_entry_repo.count.return_value = 0

        await entry_service.get_all(user_id=user_id)

        # El repositorio debe recibir SIEMPRE el user_id del usuario autenticado.
        called_kwargs = mock_entry_repo.get_all.await_args.kwargs
        assert called_kwargs["user_id"] == user_id
        assert called_kwargs["user_id"] != other_user_id

    async def test_get_all_respects_pagination(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L3: paginación con offset calculado correctamente."""
        user_id = uuid4()
        mock_entry_repo.get_all.return_value = []
        mock_entry_repo.count.return_value = 50

        result = await entry_service.get_all(user_id=user_id, page=3, limit=10)

        assert result.page == 3
        assert result.limit == 10
        assert result.total_pages == 5
        mock_entry_repo.get_all.assert_awaited_once_with(
            user_id=user_id,
            entry_type=None,
            search=None,
            sort_by=SortField.created_at,
            sort_order=SortOrder.desc,
            limit=10,
            offset=20,
        )

    async def test_get_all_filters_by_type(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L2: filtro por tipo aplicado en servicio y repositorio."""
        user_id = uuid4()
        mock_entry_repo.get_all.return_value = []
        mock_entry_repo.count.return_value = 0

        await entry_service.get_all(user_id=user_id, entry_type=EntryType.game)

        mock_entry_repo.get_all.assert_awaited_once_with(
            user_id=user_id,
            entry_type=EntryType.game,
            search=None,
            sort_by=SortField.created_at,
            sort_order=SortOrder.desc,
            limit=15,
            offset=0,
        )
        mock_entry_repo.count.assert_awaited_once_with(
            user_id=user_id, entry_type=EntryType.game, search=None
        )

    async def test_get_all_orders_by_created_at_desc(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L5: las entradas se ordenan por created_at DESC.

        La ordenación es responsabilidad del repositorio; aquí verificamos
        que el servicio devuelve los ítems en el orden que recibe del repo.
        """
        user_id = uuid4()
        older = make_entry(
            title="Old Entry",
            user_id=user_id,
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        )
        newer = make_entry(
            title="New Entry",
            user_id=user_id,
            created_at=datetime(2024, 12, 31, tzinfo=timezone.utc),
        )
        # Simulamos que el repo ya devolvió los resultados ordenados DESC.
        mock_entry_repo.get_all.return_value = [newer, older]
        mock_entry_repo.count.return_value = 2

        result = await entry_service.get_all(user_id=user_id)

        assert result.entries[0].title == "New Entry"
        assert result.entries[1].title == "Old Entry"

    async def test_get_all_invalid_page_raises_domain_error(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """page < 1 debe lanzar InvalidPaginationError con mensaje descriptivo."""
        with pytest.raises(InvalidPaginationError) as exc_info:
            await entry_service.get_all(user_id=uuid4(), page=0)

        assert "page" in str(exc_info.value).lower()
        mock_entry_repo.get_all.assert_not_awaited()

    async def test_get_all_limit_out_of_range_raises_domain_error(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """limit fuera del rango [1, 100] debe lanzar InvalidPaginationError."""
        with pytest.raises(InvalidPaginationError) as exc_info:
            await entry_service.get_all(user_id=uuid4(), limit=0)

        assert "limit" in str(exc_info.value).lower()
        mock_entry_repo.get_all.assert_not_awaited()

    async def test_get_all_empty_collection_returns_200_metadata(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio L6: sin entradas retorna respuesta vacía con metadatos en cero."""
        mock_entry_repo.get_all.return_value = []
        mock_entry_repo.count.return_value = 0

        result = await entry_service.get_all(user_id=uuid4())

        assert result.entries == []
        assert result.total == 0
        assert result.total_pages == 0
        assert result.page == 1
        assert result.limit == 15

    async def test_get_all_filters_by_search(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """La búsqueda por texto propaga el parámetro search al repositorio."""
        user_id = uuid4()
        mock_entry_repo.get_all.return_value = []
        mock_entry_repo.count.return_value = 0

        await entry_service.get_all(user_id=user_id, search="Naruto")

        mock_entry_repo.get_all.assert_awaited_once_with(
            user_id=user_id,
            entry_type=None,
            search="Naruto",
            sort_by=SortField.created_at,
            sort_order=SortOrder.desc,
            limit=15,
            offset=0,
        )
        mock_entry_repo.count.assert_awaited_once_with(
            user_id=user_id,
            entry_type=None,
            search="Naruto",
        )

    async def test_get_all_filters_by_sorting(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """El servicio propaga sort_by y sort_order correctamente al repositorio."""
        user_id = uuid4()
        mock_entry_repo.get_all.return_value = []
        mock_entry_repo.count.return_value = 0

        await entry_service.get_all(
            user_id=user_id,
            sort_by=SortField.title,
            sort_order=SortOrder.asc,
        )

        mock_entry_repo.get_all.assert_awaited_once_with(
            user_id=user_id,
            entry_type=None,
            search=None,
            sort_by=SortField.title,
            sort_order=SortOrder.asc,
            limit=15,
            offset=0,
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
