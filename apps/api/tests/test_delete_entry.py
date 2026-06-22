"""Tests del endpoint de eliminar entrada (DELETE /api/v1/entries/{entry_id}).

Cobertura: integración HTTP con dependencias mockeadas.
No requiere PostgreSQL corriendo.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from httpx import AsyncClient

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
# Tests de integración HTTP
# ---------------------------------------------------------------------------


class TestDeleteEntryEndpoint:
    """Tests del endpoint DELETE /api/v1/entries/{entry_id} vía HTTP."""

    async def test_delete_entry_success(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Eliminar entrada existente del usuario → 204 No Content."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.delete.return_value = True
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.delete(f"/api/v1/entries/{entry.id}")

            assert response.status_code == 204
            assert response.content == b""
            mock_entry_repo.delete.assert_awaited_once_with(entry.id, user.id)
        finally:
            clear_overrides()

    async def test_delete_entry_not_found(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Eliminar entrada inexistente → 404."""
        user = make_user()
        mock_entry_repo.delete.return_value = False
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.delete(f"/api/v1/entries/{uuid4()}")

            assert response.status_code == 404
            assert "no encontrada" in response.json()["detail"].lower()
        finally:
            clear_overrides()

    async def test_delete_entry_other_user_returns_404(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Eliminar entrada de otro usuario → 404 (aislamiento de datos)."""
        user = make_user()
        other_user = make_user()
        entry = make_entry(user_id=other_user.id)
        mock_entry_repo.delete.return_value = False
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.delete(f"/api/v1/entries/{entry.id}")

            assert response.status_code == 404
            mock_entry_repo.delete.assert_awaited_once_with(entry.id, user.id)
        finally:
            clear_overrides()

    async def test_delete_entry_requires_authentication(
        self, client: AsyncClient
    ) -> None:
        """Endpoint requiere autenticación (sin token → 401)."""
        response = await client.delete(f"/api/v1/entries/{uuid4()}")

        assert response.status_code == 401
