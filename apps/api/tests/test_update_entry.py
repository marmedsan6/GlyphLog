"""Tests del endpoint de actualizar entrada (PUT /api/v1/entries/{entry_id}).

Cobertura: integración HTTP con dependencias mockeadas.
No requiere PostgreSQL corriendo.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

from httpx import AsyncClient

from app.models.entry import EntryStatus, EntryType
from app.schemas.entry import EntryUpdate
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


class TestUpdateEntryEndpoint:
    """Tests del endpoint PUT /api/v1/entries/{entry_id} vía HTTP."""

    async def test_update_entry_success(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar entrada existente con datos válidos → 200 con EntryResponse."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            title="One Piece (Updated)",
            entry_type=EntryType.manga,
            entry_status=EntryStatus.completed,
            rating=9.5,
            year=1999,
            notes="Updated notes",
            cover_image="/uploads/covers/updated.jpg",
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
                    "title": "One Piece (Updated)",
                    "type": "manga",
                    "status": "completed",
                    "rating": 9.5,
                    "year": 1999,
                    "notes": "Updated notes",
                    "cover_image": "/uploads/covers/updated.jpg",
                },
            )

            assert response.status_code == 200
            body = response.json()
            assert body["id"] == str(entry.id)
            assert body["title"] == "One Piece (Updated)"
            assert body["type"] == "manga"
            assert body["status"] == "completed"
            assert body["rating"] == 9.5
            assert body["year"] == 1999
            assert body["notes"] == "Updated notes"
            assert body["cover_image"] == "/uploads/covers/updated.jpg"
            assert body["user_id"] == str(user.id)
            mock_entry_repo.update.assert_awaited_once()
        finally:
            clear_overrides()

    async def test_update_entry_partial(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar solo algunos campos → 200 con los campos actualizados."""
        user = make_user()
        entry = make_entry(user_id=user.id, title="One Piece")
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            title="One Piece (Renamed)",
        )
        mock_entry_repo.get_by_id.return_value = entry
        mock_entry_repo.update.return_value = updated_entry
        entry_service.progress_event_repo.has_events.return_value = False
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{entry.id}",
                json={"title": "One Piece (Renamed)"},
            )

            assert response.status_code == 200
            body = response.json()
            assert body["title"] == "One Piece (Renamed)"
            called_args, _ = mock_entry_repo.update.await_args
            assert called_args[0] == entry.id
            assert called_args[1] == user.id
            assert isinstance(called_args[2], EntryUpdate)
            assert called_args[2].title == "One Piece (Renamed)"
        finally:
            clear_overrides()

    async def test_update_entry_not_found(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar entrada inexistente → 404."""
        user = make_user()
        mock_entry_repo.get_by_id.return_value = None
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"title": "New title"},
            )

            assert response.status_code == 404
            assert "no encontrada" in response.json()["detail"].lower()
        finally:
            clear_overrides()

    async def test_update_entry_other_user_returns_404(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar entrada de otro usuario → 404 (aislamiento de datos)."""
        user = make_user()
        other_user = make_user()
        entry = make_entry(user_id=other_user.id)
        mock_entry_repo.get_by_id.return_value = None
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{entry.id}",
                json={"title": "Hacked title"},
            )

            assert response.status_code == 404
            mock_entry_repo.update.assert_not_awaited()
            mock_entry_repo.get_by_id.assert_awaited_once_with(entry.id, user.id)
        finally:
            clear_overrides()

    async def test_update_entry_duplicate_returns_409(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar a un (título, tipo) duplicado → 409 Conflict."""
        from sqlalchemy.exc import IntegrityError

        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.get_by_id.return_value = entry
        entry_service.progress_event_repo.has_events.return_value = False
        mock_entry_repo.update.side_effect = IntegrityError(
            statement="UPDATE entries",
            params={},
            orig=Exception("unique violation"),
        )
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{entry.id}",
                json={"title": "Duplicate", "type": "anime"},
            )

            assert response.status_code == 409
            assert "ya tienes una entrada" in response.json()["detail"].lower()
            mock_entry_repo.update.assert_awaited_once()
        finally:
            clear_overrides()

    async def test_update_entry_empty_title(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar con título vacío → 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"title": ""},
            )

            assert response.status_code == 422
            assert "vacío" in response.json()["detail"].lower()
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_title_too_long(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar con título > 500 caracteres → 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"title": "a" * 501},
            )

            assert response.status_code == 422
            assert "500" in response.json()["detail"].lower()
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_cover_image_too_long(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar con cover_image > 500 caracteres → 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"cover_image": "a" * 501},
            )

            assert response.status_code == 422
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_rating_out_of_range(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar con rating fuera de rango → 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"rating": 10.5},
            )

            assert response.status_code == 422
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_year_out_of_range(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar con año fuera de rango → 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"year": 2101},
            )

            assert response.status_code == 422
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_notes_too_long(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar con notes > 5000 caracteres → 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"notes": "a" * 5001},
            )

            assert response.status_code == 422
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_invalid_type(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar con tipo inválido → 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"type": "movie"},
            )

            assert response.status_code == 422
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_invalid_status(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Actualizar con estado inválido → 422."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"status": "reading"},
            )

            assert response.status_code == 422
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_clears_rating(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Enviar rating: null limpia el campo en la entrada."""
        user = make_user()
        entry = make_entry(user_id=user.id, rating=8.5)
        updated_entry = make_entry(entry_id=entry.id, user_id=user.id, rating=None)
        mock_entry_repo.get_by_id.return_value = entry
        mock_entry_repo.update.return_value = updated_entry
        entry_service.progress_event_repo.has_events.return_value = False
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{entry.id}",
                json={"rating": None},
            )

            assert response.status_code == 200
            assert response.json()["rating"] is None
            called_args, _ = mock_entry_repo.update.await_args
            assert called_args[2].rating is None
        finally:
            clear_overrides()

    async def test_update_entry_clears_year(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Enviar year: null limpia el campo en la entrada."""
        user = make_user()
        entry = make_entry(user_id=user.id, year=1999)
        updated_entry = make_entry(entry_id=entry.id, user_id=user.id, year=None)
        mock_entry_repo.get_by_id.return_value = entry
        mock_entry_repo.update.return_value = updated_entry
        entry_service.progress_event_repo.has_events.return_value = False
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{entry.id}",
                json={"year": None},
            )

            assert response.status_code == 200
            assert response.json()["year"] is None
            called_args, _ = mock_entry_repo.update.await_args
            assert called_args[2].year is None
        finally:
            clear_overrides()

    async def test_update_entry_clears_notes(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Enviar notes: null limpia el campo en la entrada."""
        user = make_user()
        entry = make_entry(user_id=user.id, notes="Notas previas")
        updated_entry = make_entry(entry_id=entry.id, user_id=user.id, notes=None)
        mock_entry_repo.get_by_id.return_value = entry
        mock_entry_repo.update.return_value = updated_entry
        entry_service.progress_event_repo.has_events.return_value = False
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{entry.id}",
                json={"notes": None},
            )

            assert response.status_code == 200
            assert response.json()["notes"] is None
            called_args, _ = mock_entry_repo.update.await_args
            assert called_args[2].notes is None
        finally:
            clear_overrides()

    async def test_update_entry_clears_cover_image(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Enviar cover_image: null limpia el campo en la entrada."""
        user = make_user()
        entry = make_entry(user_id=user.id, cover_image="/uploads/covers/old.jpg")
        updated_entry = make_entry(entry_id=entry.id, user_id=user.id, cover_image=None)
        mock_entry_repo.get_by_id.return_value = entry
        mock_entry_repo.update.return_value = updated_entry
        entry_service.progress_event_repo.has_events.return_value = False
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{entry.id}",
                json={"cover_image": None},
            )

            assert response.status_code == 200
            assert response.json()["cover_image"] is None
            called_args, _ = mock_entry_repo.update.await_args
            assert called_args[2].cover_image is None
        finally:
            clear_overrides()

    async def test_update_entry_type_null_returns_422(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """type es obligatorio; enviar null debe devolver 422, no 500 de BD."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"type": None},
            )

            assert response.status_code == 422
            assert "type" in response.json()["detail"].lower()
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_status_null_returns_422(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """status es obligatorio; enviar null debe devolver 422, no 500 de BD."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.put(
                f"/api/v1/entries/{uuid4()}",
                json={"status": None},
            )

            assert response.status_code == 422
            assert "status" in response.json()["detail"].lower()
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_update_entry_requires_authentication(
        self, client: AsyncClient
    ) -> None:
        """Endpoint requiere autenticación (sin token → 401)."""
        response = await client.put(
            f"/api/v1/entries/{uuid4()}",
            json={"title": "New title"},
        )

        assert response.status_code == 401
