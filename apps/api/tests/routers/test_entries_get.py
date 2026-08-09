"""Tests del endpoint de consultar entrada (GET /api/v1/entries/{entry_id}).

Cobertura: integración HTTP con dependencias mockeadas.
No requiere PostgreSQL corriendo.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

from httpx import AsyncClient

from app.models.entry import EntryStatus
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
# Tests de integración HTTP
# ---------------------------------------------------------------------------


class TestGetEntryEndpoint:
    """Tests del endpoint GET /api/v1/entries/{entry_id} vía HTTP."""

    async def test_get_entry_success(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Consultar entrada existente del usuario → 200 con EntryResponse."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_status=EntryStatus.completed,
            rating=9.0,
            year=1999,
            notes="Great anime",
            cover_image="/uploads/covers/one-piece.jpg",
        )
        mock_entry_repo.get_by_id.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get(f"/api/v1/entries/{entry.id}")

            assert response.status_code == 200
            body = response.json()
            assert body["id"] == str(entry.id)
            assert body["title"] == entry.title
            assert body["type"] == entry.type.value
            assert body["status"] == entry.status.value
            assert body["rating"] == 9.0
            assert body["year"] == 1999
            assert body["notes"] == "Great anime"
            assert body["cover_image"] == "/uploads/covers/one-piece.jpg"
            assert body["user_id"] == str(user.id)
            assert "created_at" in body
            assert "updated_at" in body
            mock_entry_repo.get_by_id.assert_awaited_once_with(entry.id, user.id)
        finally:
            clear_overrides()

    async def test_get_entry_not_found(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Consultar entrada inexistente → 404."""
        user = make_user()
        mock_entry_repo.get_by_id.return_value = None
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get(f"/api/v1/entries/{uuid4()}")

            assert response.status_code == 404
            assert "no encontrada" in response.json()["detail"].lower()
        finally:
            clear_overrides()

    async def test_get_entry_other_user_returns_404(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Consultar entrada de otro usuario → 404 (aislamiento de datos)."""
        user = make_user()
        other_user = make_user()
        entry = make_entry(user_id=other_user.id)
        mock_entry_repo.get_by_id.return_value = None
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get(f"/api/v1/entries/{entry.id}")

            assert response.status_code == 404
            mock_entry_repo.get_by_id.assert_awaited_once_with(entry.id, user.id)
        finally:
            clear_overrides()

    async def test_get_entry_requires_authentication(
        self, client: AsyncClient
    ) -> None:
        """Endpoint requiere autenticación (sin token → 401)."""
        response = await client.get(f"/api/v1/entries/{uuid4()}")

        assert response.status_code == 401
