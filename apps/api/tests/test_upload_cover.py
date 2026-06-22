"""Tests del endpoint de subida de portada (POST /api/v1/entries/{entry_id}/cover).

Cobertura: autenticación, propiedad de la entrada, imagen válida e inválida.
No requiere PostgreSQL corriendo.
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.services.entry_service import EntryService
from tests.factories import (
    make_entry,
    make_user,
    client,  # noqa: F401  # fixture compartido
    entry_service,  # noqa: F401  # fixture compartido
    mock_entry_repo,  # noqa: F401  # fixture compartido
    override_current_user,
    override_entry_service,
    clear_overrides,
)


# Bytes mínimos válidos de una imagen PNG (magic bytes + chunk IHDR vacío)
VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _make_image_file(filename: str, content: bytes) -> tuple[str, bytes, str]:
    """Devuelve la tupla (field_name, content, content_type) esperada por httpx."""
    return (filename, content, "image/png")


class TestUploadCoverEndpoint:
    """Tests del endpoint POST /api/v1/entries/{entry_id}/cover vía HTTP."""

    async def test_upload_cover_image_success(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Subir imagen válida a una entrada propia → 200 y cover_image actualizado."""
        user = make_user()
        entry = make_entry(user_id=user.id, cover_image=None)
        updated_entry = make_entry(
            entry_id=entry.id,
            user_id=user.id,
            cover_image="/uploads/covers/new-cover.png",
        )
        mock_entry_repo.update.return_value = updated_entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            with patch(
                "app.services.entry_service.save_cover_image",
                return_value="/uploads/covers/new-cover.png",
            ) as mock_save:
                response = await client.post(
                    f"/api/v1/entries/{entry.id}/cover",
                    files={"cover_image": _make_image_file("cover.png", VALID_PNG_BYTES)},
                )

            assert response.status_code == 200
            body = response.json()
            assert body["id"] == str(entry.id)
            assert body["cover_image"] == "/uploads/covers/new-cover.png"
            mock_save.assert_awaited_once()
            mock_entry_repo.update.assert_awaited_once()
            called_args, _ = mock_entry_repo.update.await_args
            assert called_args[0] == entry.id
            assert called_args[1] == user.id
            assert called_args[2].cover_image == "/uploads/covers/new-cover.png"
        finally:
            clear_overrides()

    async def test_upload_cover_image_other_user_returns_404(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Subir imagen a entrada de otro usuario → 404 (aislamiento de datos)."""
        user = make_user()
        other_user = make_user()
        entry = make_entry(user_id=other_user.id)
        mock_entry_repo.update.return_value = None
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            with patch(
                "app.services.entry_service.save_cover_image",
                return_value="/uploads/covers/new-cover.png",
            ):
                response = await client.post(
                    f"/api/v1/entries/{entry.id}/cover",
                    files={"cover_image": _make_image_file("cover.png", VALID_PNG_BYTES)},
                )

            assert response.status_code == 404
            assert "no encontrada" in response.json()["detail"].lower()
        finally:
            clear_overrides()

    async def test_upload_cover_image_entry_not_found_returns_404(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Subir imagen a entrada inexistente → 404."""
        user = make_user()
        mock_entry_repo.update.return_value = None
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            with patch(
                "app.services.entry_service.save_cover_image",
                return_value="/uploads/covers/new-cover.png",
            ):
                response = await client.post(
                    f"/api/v1/entries/{uuid4()}/cover",
                    files={"cover_image": _make_image_file("cover.png", VALID_PNG_BYTES)},
                )

            assert response.status_code == 404
            assert "no encontrada" in response.json()["detail"].lower()
        finally:
            clear_overrides()

    async def test_upload_cover_image_invalid_file_returns_422(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Subir archivo que no es imagen → 422."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                f"/api/v1/entries/{entry.id}/cover",
                files={"cover_image": _make_image_file("not-image.txt", b"not an image")},
            )

            assert response.status_code == 422
            mock_entry_repo.update.assert_not_awaited()
        finally:
            clear_overrides()

    async def test_upload_cover_image_requires_authentication(
        self, client: AsyncClient
    ) -> None:
        """Endpoint requiere autenticación (sin token → 401)."""
        response = await client.post(
            f"/api/v1/entries/{uuid4()}/cover",
            files={"cover_image": _make_image_file("cover.png", VALID_PNG_BYTES)},
        )

        assert response.status_code == 401
