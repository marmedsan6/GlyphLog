"""Tests de integración (router) para endpoints de progreso.

Cobertura: reset de progreso, creación con progreso, actualización con
progreso, actualización manual e historial a través de HTTP.
No requiere PostgreSQL corriendo (usa dependencias mockeadas).
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.models.entry import EntryType
from app.models.enums import ProgressUnit
from app.repositories.entry_repository import EntryRepository
from app.repositories.progress_event_repository import ProgressEventRepository
from app.services.entry_service import EntryService
from tests.factories import (
    clear_overrides,
    make_entry,
    make_user,
    override_current_user,
    override_entry_service,
)


@pytest.fixture
def mock_entry_repo() -> AsyncMock:
    return AsyncMock(spec=EntryRepository)


@pytest.fixture
def entry_service(mock_entry_repo: AsyncMock) -> EntryService:
    progress_event_repo = AsyncMock(spec=ProgressEventRepository)
    progress_event_repo.has_events.return_value = False
    return EntryService(
        entry_repo=mock_entry_repo,
        progress_event_repo=progress_event_repo,
    )


class TestResetProgressEndpoint:
    """Tests del endpoint POST /api/v1/entries/{entry_id}/progress/reset."""

    async def test_reset_progress_endpoint_success(
        self,
        client: AsyncClient,
        entry_service: EntryService,
        mock_entry_repo: AsyncMock,
    ) -> None:
        """Reset exitoso devuelve 200 con EntryResponse."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.manga,
            progress_unit=ProgressUnit.chapters,
            current_progress=50,
        )
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            current_progress=0,
            progress_total=24,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry
        mock_entry_repo.update.return_value = updated_entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                f"/api/v1/entries/{entry.id}/progress/reset",
                json={
                    "reason": "Cambio de formato",
                    "new_type": "anime",
                    "new_progress_total": 24,
                },
            )

            assert response.status_code == 200
            body = response.json()
            assert body["type"] == "anime"
            assert body["progress_unit"] == "episodes"
            assert body["current_progress"] == 0
            assert body["progress_total"] == 24
        finally:
            clear_overrides()

    async def test_reset_progress_endpoint_not_found(
        self,
        client: AsyncClient,
        entry_service: EntryService,
        mock_entry_repo: AsyncMock,
    ) -> None:
        """Reset sobre entrada inexistente → 404."""
        user = make_user()
        mock_entry_repo.get_by_id_for_update.return_value = None
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                f"/api/v1/entries/{uuid4()}/progress/reset",
                json={},
            )

            assert response.status_code == 404
        finally:
            clear_overrides()


class TestCreateEntryWithProgress:
    """Tests del endpoint POST /api/v1/entries con configuración de progreso."""

    async def test_create_entry_with_progress_config(
        self,
        client: AsyncClient,
        entry_service: EntryService,
        mock_entry_repo: AsyncMock,
    ) -> None:
        """Crear entrada con unidad y total de progreso → 201."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            progress_total=12,
            current_progress=0,
        )
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "Attack on Titan",
                    "type": "anime",
                    "status": "watching",
                    "progress_unit": "episodes",
                    "progress_total": "12",
                },
            )

            assert response.status_code == 201
            body = response.json()
            assert body["progress_unit"] == "episodes"
            assert body["progress_total"] == 12
            assert body["current_progress"] == 0
        finally:
            clear_overrides()

    async def test_create_entry_with_invalid_unit_returns_422(
        self,
        client: AsyncClient,
        entry_service: EntryService,
    ) -> None:
        """Crear entrada anime con unidad chapters → 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "Attack on Titan",
                    "type": "anime",
                    "status": "watching",
                    "progress_unit": "chapters",
                    "progress_total": "12",
                },
            )

            assert response.status_code == 422
        finally:
            clear_overrides()


class TestUpdateEntryWithProgress:
    """Tests del endpoint PUT /api/v1/entries/{entry_id} con progreso."""

    async def test_update_progress_config(
        self,
        client: AsyncClient,
        entry_service: EntryService,
        mock_entry_repo: AsyncMock,
    ) -> None:
        """Actualizar total sin historial → 200."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.game,
            progress_unit=ProgressUnit.hours,
        )
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            entry_type=EntryType.game,
            progress_unit=ProgressUnit.hours,
            progress_total=40.5,
        )
        mock_entry_repo.get_by_id.return_value = entry
        mock_entry_repo.update.return_value = updated_entry
        entry_service.progress_event_repo.has_events.return_value = False
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{entry.id}",
                json={
                    "progress_total": 40.5,
                },
            )

            assert response.status_code == 200
            body = response.json()
            assert body["progress_unit"] == "hours"
            assert body["progress_total"] == 40.5
        finally:
            clear_overrides()

    async def test_update_unit_with_history_returns_409(
        self,
        client: AsyncClient,
        entry_service: EntryService,
        mock_entry_repo: AsyncMock,
    ) -> None:
        """Actualizar unidad con historial → 409."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.manga,
            progress_unit=ProgressUnit.chapters,
        )
        mock_entry_repo.get_by_id.return_value = entry
        entry_service.progress_event_repo.has_events.return_value = True
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{entry.id}",
                json={"progress_unit": "volumes"},
            )

            assert response.status_code == 409
            assert "historial" in response.json()["detail"].lower()
        finally:
            clear_overrides()


class TestManualProgressUpdateEndpoint:
    """Tests del endpoint POST /api/v1/entries/{entry_id}/progress."""

    async def test_update_progress_endpoint_success(
        self,
        client: AsyncClient,
        entry_service: EntryService,
        mock_entry_repo: AsyncMock,
    ) -> None:
        """La llamada exitosa devuelve 200 y el objeto actualizado."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            current_progress=5,
            progress_total=12,
        )
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            current_progress=8,
            progress_total=12,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry
        mock_entry_repo.update.return_value = updated_entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                f"/api/v1/entries/{entry.id}/progress",
                json={
                    "new_value": 8,
                    "note": "Avanzando un poco",
                    "mark_completed": False,
                },
            )

            assert response.status_code == 200
            body = response.json()
            assert body["current_progress"] == 8
        finally:
            clear_overrides()

    async def test_update_progress_endpoint_not_found(
        self,
        client: AsyncClient,
        entry_service: EntryService,
        mock_entry_repo: AsyncMock,
    ) -> None:
        """Llamar a actualizar progreso de una entrada inexistente da 404."""
        user = make_user()
        mock_entry_repo.get_by_id_for_update.return_value = None
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                f"/api/v1/entries/{uuid4()}/progress",
                json={
                    "new_value": 5,
                },
            )

            assert response.status_code == 404
        finally:
            clear_overrides()


class TestProgressHistoryEndpoint:
    """Tests del endpoint GET /api/v1/entries/{entry_id}/progress/history."""

    async def test_get_progress_history_endpoint_success(
        self,
        client: AsyncClient,
        entry_service: EntryService,
        mock_entry_repo: AsyncMock,
    ) -> None:
        """Devuelve 200 OK con el historial paginado."""
        from datetime import datetime, timezone

        from app.models.enums import ProgressEventType
        from app.models.progress_event import ProgressEvent

        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.get_by_id.return_value = entry

        now = datetime.now(timezone.utc)
        mock_event = ProgressEvent(
            id=uuid4(),
            entry_id=entry.id,
            user_id=user.id,
            previous_value=0,
            current_value=1,
            unit=ProgressUnit.episodes,
            recorded_at=now,
            note=None,
            source="web",
            event_type=ProgressEventType.update,
        )
        entry_service.progress_event_repo.get_history.return_value = [mock_event]

        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.get(
                f"/api/v1/entries/{entry.id}/progress/history",
            )

            assert response.status_code == 200
            body = response.json()
            assert "events" in body
            assert len(body["events"]) == 1
            assert body["events"][0]["delta"] == 1
            assert body["has_more"] is False
            assert body["next_cursor"] is None
        finally:
            clear_overrides()
