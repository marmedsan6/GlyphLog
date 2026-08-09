"""Tests del servicio EntryService.create() con repositorio mockeado.

Cobertura: lógica de negocio de crear entrada.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.models.entry import EntryStatus, EntryType
from app.schemas.entry import EntryCreate
from app.services.entry_service import EntryService
from tests.factories import (
    entry_service,  # noqa: F401  # fixture compartido
    make_entry,
    mock_entry_repo,  # noqa: F401  # fixture compartido
)

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
