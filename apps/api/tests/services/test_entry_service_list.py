"""Tests unitarios de EntryService.get_all() para listar entradas.

Cobertura: lógica de negocio de listar entradas con repositorio mockeado.
Todos los tests usan mocks — no requieren PostgreSQL corriendo.
"""

from datetime import datetime, timezone
from math import ceil
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.models.entry import EntryType
from app.schemas.entry import (
    EntryListItem,
    PaginatedEntryResponse,
    SortField,
    SortOrder,
)
from app.services.entry_service import EntryService, InvalidPaginationError
from tests.factories import (
    entry_service,  # noqa: F401  # fixture compartido
    make_entry,
    mock_entry_repo,  # noqa: F401  # fixture compartido
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
        mock_entry_repo.count.assert_awaited_once_with(
            user_id=user_id, entry_type=None, search=None
        )

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
