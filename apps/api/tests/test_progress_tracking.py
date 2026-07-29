"""Tests de integración y servicio para seguimiento de progreso.

Cobertura: bloqueo por historial, reset de progreso y endpoints.
No requiere PostgreSQL corriendo (usa dependencias mockeadas).
"""

from unittest.mock import ANY, AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from app.models.entry import EntryStatus, EntryType
from app.models.enums import ProgressUnit
from app.repositories.entry_repository import EntryRepository
from app.repositories.progress_event_repository import ProgressEventRepository
from app.schemas.entry import EntryUpdate
from app.schemas.progress import ProgressResetRequest, ProgressUpdateRequest
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


class TestEntryServiceProgressBlocking:
    """Lógica de negocio de bloqueo por historial de progreso."""

    async def test_update_type_without_history_re_derives_unit(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Cambiar el tipo sin historial re-deriva la unidad fija."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.manga,
            progress_unit=ProgressUnit.chapters,
        )
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            entry_type=EntryType.game,
            progress_unit=ProgressUnit.hours,
        )
        mock_entry_repo.get_by_id.return_value = entry
        mock_entry_repo.update.return_value = updated_entry
        entry_service.progress_event_repo.has_events.return_value = False

        result = await entry_service.update(
            entry.id,
            user.id,
            EntryUpdate(type=EntryType.game),
        )

        assert result.progress_unit == ProgressUnit.hours

    async def test_update_unit_with_history_is_blocked(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Cambiar a unidad no fija con historial devuelve 409."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.manga,
            progress_unit=ProgressUnit.chapters,
        )
        mock_entry_repo.get_by_id.return_value = entry
        entry_service.progress_event_repo.has_events.return_value = True

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update(
                entry.id,
                user.id,
                EntryUpdate(progress_unit=ProgressUnit.volumes),
            )

        assert exc_info.value.status_code == 409
        assert "historial" in exc_info.value.detail.lower()

    async def test_update_type_with_history_is_blocked(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Cambiar el tipo con historial devuelve 409."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.manga,
            progress_unit=ProgressUnit.chapters,
        )
        mock_entry_repo.get_by_id.return_value = entry
        entry_service.progress_event_repo.has_events.return_value = True

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update(
                entry.id,
                user.id,
                EntryUpdate(type=EntryType.anime),
            )

        assert exc_info.value.status_code == 409
        assert "historial" in exc_info.value.detail.lower()

    async def test_update_incompatible_unit_without_history_is_blocked(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Cambiar a una unidad incompatible con el tipo actual es 422."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
        )
        mock_entry_repo.get_by_id.return_value = entry
        entry_service.progress_event_repo.has_events.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update(
                entry.id,
                user.id,
                EntryUpdate(progress_unit=ProgressUnit.chapters),
            )

        assert exc_info.value.status_code == 422
        assert "unidad" in exc_info.value.detail.lower()
        assert "episodes" in exc_info.value.detail.lower()

    async def test_update_current_progress_exceeding_total_is_blocked(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """El progreso actual no puede superar el total."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            progress_total=12,
        )
        mock_entry_repo.get_by_id.return_value = entry
        entry_service.progress_event_repo.has_events.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update(
                entry.id,
                user.id,
                EntryUpdate(current_progress=20),
            )

        assert exc_info.value.status_code == 422
        assert "total" in exc_info.value.detail.lower()


class TestEntryServiceResetProgress:
    """Lógica de negocio del reinicio de progreso."""

    async def test_reset_progress_creates_event_and_clears_progress(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """El reset inserta un evento y pone current_progress a 0."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.manga,
            progress_unit=ProgressUnit.chapters,
            current_progress=25,
            progress_total=100,
        )
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            current_progress=0,
            progress_total=12,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry
        mock_entry_repo.update.return_value = updated_entry

        result = await entry_service.reset_progress(
            entry.id,
            user.id,
            ProgressResetRequest(
                reason="Cambio de formato",
                new_type="anime",
                new_progress_total=12,
            ),
        )

        assert result.type == EntryType.anime
        assert result.progress_unit == ProgressUnit.episodes
        assert result.current_progress == 0
        entry_service.progress_event_repo.create_reset.assert_awaited_once_with(
            entry_id=entry.id,
            user_id=user.id,
            previous_value=25,
            new_unit=ProgressUnit.episodes,
            reason="Cambio de formato",
        )
        mock_entry_repo.update.assert_awaited_once_with(entry.id, user.id, ANY)

    async def test_reset_progress_with_invalid_type_is_blocked(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """No se puede resetear a un tipo inválido."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            current_progress=10,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.reset_progress(
                entry.id,
                user.id,
                ProgressResetRequest(
                    new_type="invalid",
                ),
            )

        assert exc_info.value.status_code == 422


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


class TestEntryServiceManualProgressUpdate:
    """Lógica de negocio de la actualización manual de progreso."""

    async def test_update_progress_succeeds(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar progreso de forma manual es válido y crea evento."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            current_progress=2,
            progress_total=12,
        )
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            current_progress=5,
            progress_total=12,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry
        mock_entry_repo.update.return_value = updated_entry

        result = await entry_service.update_progress(
            entry.id,
            user.id,
            ProgressUpdateRequest(new_value=5, note="Viendo con amigos"),
        )

        assert result.current_progress == 5
        entry_service.progress_event_repo.create.assert_awaited_once_with(
            entry_id=entry.id,
            user_id=user.id,
            data=ANY,
        )
        # Verificar los datos pasados al crear el evento
        passed_data = entry_service.progress_event_repo.create.call_args[1]["data"]
        assert passed_data.previous_value == 2
        assert passed_data.current_value == 5
        assert passed_data.unit == ProgressUnit.episodes
        assert passed_data.note == "Viendo con amigos"
        assert passed_data.source == "web"

    async def test_update_progress_reduction_succeeds(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Una reducción en el progreso también es válida (corrección)."""
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
            current_progress=3,
            progress_total=12,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry
        mock_entry_repo.update.return_value = updated_entry

        result = await entry_service.update_progress(
            entry.id,
            user.id,
            ProgressUpdateRequest(new_value=3, note="Corrección de error"),
        )

        assert result.current_progress == 3
        passed_data = entry_service.progress_event_repo.create.call_args[1]["data"]
        assert passed_data.previous_value == 5
        assert passed_data.current_value == 3
        assert passed_data.note == "Corrección de error"

    async def test_update_progress_without_unit_fails(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar progreso en entrada sin unidad configurada da 422."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=None,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update_progress(
                entry.id,
                user.id,
                ProgressUpdateRequest(new_value=5),
            )

        assert exc_info.value.status_code == 422
        assert "seguimiento" in exc_info.value.detail.lower()

    async def test_update_progress_with_decimal_hours_succeeds(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar progreso con horas decimales es válido."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.game,
            progress_unit=ProgressUnit.hours,
            current_progress=0.5,
            progress_total=40,
        )
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            entry_type=EntryType.game,
            progress_unit=ProgressUnit.hours,
            current_progress=1.0,
            progress_total=40,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry
        mock_entry_repo.update.return_value = updated_entry

        result = await entry_service.update_progress(
            entry.id,
            user.id,
            ProgressUpdateRequest(new_value=1.0),
        )

        assert result.current_progress == 1.0

    async def test_update_progress_with_decimal_episodes_is_blocked(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar progreso con episodios decimales da 422."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            current_progress=2,
            progress_total=12,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update_progress(
                entry.id,
                user.id,
                ProgressUpdateRequest(new_value=2.5),
            )

        assert exc_info.value.status_code == 422
        assert "entero" in exc_info.value.detail.lower()

    def test_update_progress_with_too_many_decimals_is_blocked(self) -> None:
        """Horas con más de 2 decimales falla en validación del schema."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError) as exc_info:
            ProgressUpdateRequest(new_value=1.005)

        assert "2 decimales" in str(exc_info.value).lower()

    async def test_update_progress_exceeding_total_fails(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar progreso por encima del total da 422."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            progress_unit=ProgressUnit.episodes,
            current_progress=2,
            progress_total=12,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.update_progress(
                entry.id,
                user.id,
                ProgressUpdateRequest(new_value=15),
            )

        assert exc_info.value.status_code == 422
        assert "total" in exc_info.value.detail.lower()

    async def test_update_progress_mark_completed_changes_status(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Marcar como completado al alcanzar el total cambia el estado a completed."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            entry_status=EntryStatus.watching,
            progress_unit=ProgressUnit.episodes,
            current_progress=10,
            progress_total=12,
        )
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            entry_type=EntryType.anime,
            entry_status=EntryStatus.completed,
            progress_unit=ProgressUnit.episodes,
            current_progress=12,
            progress_total=12,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry
        mock_entry_repo.update.return_value = updated_entry

        result = await entry_service.update_progress(
            entry.id,
            user.id,
            ProgressUpdateRequest(new_value=12, mark_completed=True),
        )

        assert result.current_progress == 12
        assert result.status == EntryStatus.completed
        # Verificar que llamamos a update con status=completed
        update_payload = mock_entry_repo.update.call_args[0][2]
        assert update_payload.status == EntryStatus.completed

    async def test_update_progress_mark_completed_ignored_if_not_total(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """mark_completed=True se ignora si no se alcanza el total."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            entry_type=EntryType.anime,
            entry_status=EntryStatus.watching,
            progress_unit=ProgressUnit.episodes,
            current_progress=10,
            progress_total=12,
        )
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            entry_type=EntryType.anime,
            entry_status=EntryStatus.watching,
            progress_unit=ProgressUnit.episodes,
            current_progress=11,
            progress_total=12,
        )
        mock_entry_repo.get_by_id_for_update.return_value = entry
        mock_entry_repo.update.return_value = updated_entry

        result = await entry_service.update_progress(
            entry.id,
            user.id,
            ProgressUpdateRequest(new_value=11, mark_completed=True),
        )

        assert result.current_progress == 11
        assert result.status == EntryStatus.watching
        update_payload = mock_entry_repo.update.call_args[0][2]
        assert update_payload.status is None  # no cambia


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


class TestEntryServiceProgressHistory:
    """Lógica de negocio de la consulta del historial de progreso."""

    async def test_get_progress_history_success(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Obtener el historial de una entrada propia devuelve los eventos
        y metadatos de paginación.
        """

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
            current_value=5,
            unit=ProgressUnit.episodes,
            recorded_at=now,
            note="Primer capitulo",
            source="web",
            event_type=ProgressEventType.update,
        )
        entry_service.progress_event_repo.get_history.return_value = [mock_event]

        result = await entry_service.get_progress_history(
            entry_id=entry.id,
            user_id=user.id,
            limit=20,
        )

        assert len(result.events) == 1
        assert result.events[0].id == mock_event.id
        assert result.events[0].delta == 5
        assert result.has_more is False
        assert result.next_cursor is None

    async def test_get_progress_history_not_found(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Consultar historial de entrada no existente da 404."""
        mock_entry_repo.get_by_id.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.get_progress_history(
                entry_id=uuid4(),
                user_id=uuid4(),
            )

        assert exc_info.value.status_code == 404

    async def test_get_progress_history_invalid_cursor(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Un cursor con formato de fecha inválido da 422."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.get_by_id.return_value = entry

        with pytest.raises(HTTPException) as exc_info:
            await entry_service.get_progress_history(
                entry_id=entry.id,
                user_id=user.id,
                cursor="not-a-date",
            )

        assert exc_info.value.status_code == 422
        assert "cursor" in exc_info.value.detail.lower()

    async def test_get_progress_history_has_more(
        self, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Si hay más eventos que el limite, se setea has_more=True y next_cursor."""
        from datetime import datetime, timezone

        from app.models.enums import ProgressEventType
        from app.models.progress_event import ProgressEvent

        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.get_by_id.return_value = entry

        now = datetime.now(timezone.utc)
        mock_events = [
            ProgressEvent(
                id=uuid4(),
                entry_id=entry.id,
                user_id=user.id,
                previous_value=i,
                current_value=i + 1,
                unit=ProgressUnit.episodes,
                recorded_at=now,
                note=None,
                source="web",
                event_type=ProgressEventType.update,
            )
            for i in range(3)
        ]
        # Pidiendo limit=2, si devuelve 3 items, hay más
        entry_service.progress_event_repo.get_history.return_value = mock_events

        result = await entry_service.get_progress_history(
            entry_id=entry.id,
            user_id=user.id,
            limit=2,
        )

        assert len(result.events) == 2
        assert result.has_more is True
        assert result.next_cursor == now.isoformat()


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


