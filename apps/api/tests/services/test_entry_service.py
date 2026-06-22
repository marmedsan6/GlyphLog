"""Tests unitarios de EntryService para consultar, editar y eliminar entradas.

Cobertura: get_by_id, update y delete con repositorio mockeado.
Todos los tests usan mocks — no requieren PostgreSQL corriendo.
"""

from unittest.mock import ANY, AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.entry import EntryStatus, EntryType
from app.schemas.entry import EntryUpdate
from app.services.entry_service import EntryService
from tests.factories import (
    make_entry,
    make_user,
    mock_entry_repo,  # noqa: F401  # fixture compartido
    entry_service,  # noqa: F401  # fixture compartido
)


# ---------------------------------------------------------------------------
# Tests de EntryService.get_by_id
# ---------------------------------------------------------------------------


class TestEntryServiceGetById:
    """Lógica de negocio de consultar una entrada por ID."""

    async def test_get_by_id_success(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Consultar entrada existente del usuario retorna EntryResponse."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.get_by_id.return_value = entry

        result = await entry_service.get_by_id(entry.id, user.id)

        assert result.id == entry.id
        assert result.title == entry.title
        assert result.user_id == user.id
        mock_entry_repo.get_by_id.assert_awaited_once_with(entry.id, user.id)

    async def test_get_by_id_not_found_raises_404(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Consultar entrada inexistente → 404."""
        mock_entry_repo.get_by_id.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.get_by_id(uuid4(), uuid4())

        assert exc_info.value.status_code == 404
        assert "no encontrada" in exc_info.value.detail.lower()

    async def test_get_by_id_other_user_raises_404(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Consultar entrada de otro usuario → 404 (aislamiento de datos)."""
        other_user = make_user()
        entry = make_entry(user_id=other_user.id)
        mock_entry_repo.get_by_id.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.get_by_id(entry.id, uuid4())

        assert exc_info.value.status_code == 404
        mock_entry_repo.get_by_id.assert_awaited_once_with(entry.id, ANY)


# ---------------------------------------------------------------------------
# Tests de EntryService.update
# ---------------------------------------------------------------------------


class TestEntryServiceUpdate:
    """Lógica de negocio de actualizar una entrada."""

    async def test_update_success(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar entrada existente retorna EntryResponse con los cambios."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            title="One Piece (updated)",
            entry_status=EntryStatus.completed,
            rating=9.5,
            year=1999,
            notes="Updated notes",
            cover_image="/uploads/covers/new.jpg",
        )
        mock_entry_repo.update.return_value = updated_entry

        data = EntryUpdate(
            title="One Piece (updated)",
            status=EntryStatus.completed,
            rating=9.5,
            year=1999,
            notes="Updated notes",
            cover_image="/uploads/covers/new.jpg",
        )
        result = await entry_service.update(entry.id, user.id, data)

        assert result.id == entry.id
        assert result.title == "One Piece (updated)"
        assert result.status == EntryStatus.completed
        assert result.rating == 9.5
        assert result.year == 1999
        assert result.notes == "Updated notes"
        assert result.cover_image == "/uploads/covers/new.jpg"
        mock_entry_repo.update.assert_awaited_once_with(entry.id, user.id, data)

    async def test_update_not_found_raises_404(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar entrada inexistente → 404."""
        mock_entry_repo.update.return_value = None
        data = EntryUpdate(title="New title")

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update(uuid4(), uuid4(), data)

        assert exc_info.value.status_code == 404
        assert "no encontrada" in exc_info.value.detail.lower()

    async def test_update_other_user_raises_404(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar entrada de otro usuario → 404."""
        mock_entry_repo.update.return_value = None
        data = EntryUpdate(title="New title")

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update(uuid4(), uuid4(), data)

        assert exc_info.value.status_code == 404

    async def test_update_duplicate_raises_409(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar a un (título, tipo) ya existente → 409."""
        from sqlalchemy.exc import IntegrityError

        user = make_user()
        mock_entry_repo.update.side_effect = IntegrityError(
            statement="UPDATE entries",
            params={},
            orig=Exception("unique violation"),
        )
        data = EntryUpdate(title="Duplicate", type=EntryType.anime)

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update(uuid4(), user.id, data)

        assert exc_info.value.status_code == 409
        assert "ya tienes una entrada" in exc_info.value.detail.lower()


# ---------------------------------------------------------------------------
# Tests de EntryService.delete
# ---------------------------------------------------------------------------


class TestEntryServiceDelete:
    """Lógica de negocio de eliminar una entrada."""

    async def test_delete_success(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Eliminar entrada existente del usuario retorna None sin errores."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.delete.return_value = True

        result = await entry_service.delete(entry.id, user.id)

        assert result is None
        mock_entry_repo.delete.assert_awaited_once_with(entry.id, user.id)

    async def test_delete_not_found_raises_404(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Eliminar entrada inexistente → 404."""
        mock_entry_repo.delete.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.delete(uuid4(), uuid4())

        assert exc_info.value.status_code == 404
        assert "no encontrada" in exc_info.value.detail.lower()

    async def test_delete_other_user_raises_404(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Eliminar entrada de otro usuario → 404."""
        mock_entry_repo.delete.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.delete(uuid4(), uuid4())

        assert exc_info.value.status_code == 404
