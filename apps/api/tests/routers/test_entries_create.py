"""Tests del endpoint de crear entrada (POST /api/v1/entries).

Cobertura: integración HTTP con dependencias mockeadas.
No requiere PostgreSQL corriendo.
"""

import io
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError

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
# Tests de integración HTTP — campos obligatorios
# ---------------------------------------------------------------------------


class TestCreateEntryEndpoint:
    """Tests del endpoint POST /api/v1/entries vía HTTP."""

    async def test_create_entry_success(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B1: POST retorna 201 Created con datos correctos."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 201
            body = response.json()
            assert body["title"] == "One Piece"
            assert body["type"] == "anime"
            assert body["status"] == "watching"
        finally:
            clear_overrides()

    async def test_create_entry_response_includes_all_fields(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B2: respuesta incluye id, title, type, status, user_id, created_at, updated_at."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 201
            body = response.json()
            assert "id" in body
            assert "title" in body
            assert "type" in body
            assert "status" in body
            assert "user_id" in body
            assert "rating" in body
            assert "year" in body
            assert "notes" in body
            assert "cover_image" in body
            assert "created_at" in body
            assert "updated_at" in body
        finally:
            clear_overrides()

    async def test_create_entry_user_id_from_jwt(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B3: user_id se extrae del JWT, no se acepta en el request."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            # Enviar user_id en el body debe ser ignorado (no está en EntryCreate schema)
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                    "user_id": str(uuid4()),  # Este user_id debe ignorarse
                },
            )

            assert response.status_code == 201
            body = response.json()
            # El user_id en la respuesta debe ser el del usuario autenticado
            assert body["user_id"] == str(user.id)
        finally:
            clear_overrides()

    async def test_create_entry_missing_title(
        self, client: AsyncClient
    ) -> None:
        """Criterio B4: falta título → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_entry_empty_title_http(
        self, client: AsyncClient
    ) -> None:
        """Criterio B5: título vacío vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
            assert "vacío" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_entry_whitespace_title_http(
        self, client: AsyncClient
    ) -> None:
        """Criterio B5: título solo espacios vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "     ", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
            assert "vacío" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_entry_title_over_500_chars_http(
        self, client: AsyncClient
    ) -> None:
        """Criterio B6: título > 500 chars vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "a" * 501, "type": "anime", "status": "watching"},
            )

            assert response.status_code == 422
            assert "500" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_entry_invalid_type(
        self, client: AsyncClient
    ) -> None:
        """Criterio B7: tipo inválido → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "movie", "status": "watching"},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_entry_invalid_status(
        self, client: AsyncClient
    ) -> None:
        """Criterio B8: estado inválido → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "reading"},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_entry_duplicate_http(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Criterio B9: duplicado (mismo título + tipo para usuario) vía HTTP → 409."""
        user = make_user()
        mock_entry_repo.create.side_effect = IntegrityError(
            statement="INSERT INTO entries ...",
            params={},
            orig=Exception('duplicate key value violates unique constraint "uq_entries_user_title_type"'),
        )
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "watching"},
            )

            assert response.status_code == 409
            assert "ya tienes" in response.json()["detail"].lower()
        finally:
            clear_overrides()

    async def test_create_entry_requires_authentication(
        self, client: AsyncClient
    ) -> None:
        """Criterio B11: endpoint requiere autenticación (sin token → 401)."""
        # NO mockeamos get_current_user — la dependencia real debe ejecutarse
        # y fallar al no encontrar header Authorization.
        response = await client.post(
            "/api/v1/entries/",
            data={"title": "One Piece", "type": "anime", "status": "watching"},
        )

        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Tests de integración HTTP — campos opcionales
# ---------------------------------------------------------------------------


class TestCreateEntryOptionalFieldsHTTP:
    """Tests HTTP de campos opcionales en POST /api/v1/entries."""

    async def test_create_with_all_optional_fields(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Crear entrada con todos los opcionales → 201 + campos en respuesta."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            rating=8.5,
            year=1999,
            notes="Clásico del anime",
            cover_image="/uploads/covers/test.jpg",
        )
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                    "rating": "8.5",
                    "year": "1999",
                    "notes": "Clásico del anime",
                },
            )

            assert response.status_code == 201
            body = response.json()
            assert body["rating"] == 8.5
            assert body["year"] == 1999
            assert body["notes"] == "Clásico del anime"
            assert body["cover_image"] == "/uploads/covers/test.jpg"
        finally:
            clear_overrides()

    async def test_create_without_optional_fields(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Crear entrada sin opcionales → 201 + campos null en respuesta."""
        user = make_user()
        entry = make_entry(user_id=user.id)
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                },
            )

            assert response.status_code == 201
            body = response.json()
            assert body["rating"] is None
            assert body["year"] is None
            assert body["notes"] is None
            assert body["cover_image"] is None
        finally:
            clear_overrides()

    async def test_create_with_cover_image(
        self, client: AsyncClient, entry_service: EntryService, mock_entry_repo: AsyncMock
    ) -> None:
        """Crear entrada con imagen → 201 + cover_image tiene ruta relativa."""
        user = make_user()
        entry = make_entry(
            user_id=user.id,
            cover_image="/uploads/covers/abc123.jpg",
        )
        mock_entry_repo.create.return_value = entry
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            with patch("app.routers.entries.save_cover_image", new_callable=AsyncMock) as mock_save:
                mock_save.return_value = "/uploads/covers/abc123.jpg"

                response = await client.post(
                    "/api/v1/entries/",
                    data={
                        "title": "One Piece",
                        "type": "anime",
                        "status": "watching",
                    },
                    files={
                        "cover_image": (
                            "test.jpg",
                            io.BytesIO(b"fake image data"),
                            "image/jpeg",
                        )
                    },
                )

            assert response.status_code == 201
            body = response.json()
            assert body["cover_image"] == "/uploads/covers/abc123.jpg"
            mock_save.assert_awaited_once()
        finally:
            clear_overrides()

    async def test_create_with_image_over_5mb(
        self, client: AsyncClient, entry_service: EntryService
    ) -> None:
        """Imagen > 5MB → 422 con mensaje de error descriptivo."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            # 6MB de datos — supera el límite de 5MB.
            # Se usan magic bytes JPEG válidos para que la validación de formato
            # pase y la comprobación de tamaño sea la que rechace la petición.
            large_content = b"\xff\xd8\xff" + b"x" * (6 * 1024 * 1024)

            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                },
                files={
                    "cover_image": (
                        "large.jpg",
                        io.BytesIO(large_content),
                        "image/jpeg",
                    )
                },
            )

            assert response.status_code == 422
            assert "5MB" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_with_invalid_image_mime(
        self, client: AsyncClient, entry_service: EntryService
    ) -> None:
        """Imagen con MIME inválido → 422 (validación de tipo MIME)."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                },
                files={
                    "cover_image": (
                        "test.txt",
                        io.BytesIO(b"not an image"),
                        "text/plain",
                    )
                },
            )

            assert response.status_code == 422
            assert "no válido" in response.json()["detail"]
        finally:
            clear_overrides()

    async def test_create_with_spoofed_mime(
        self, client: AsyncClient, entry_service: EntryService
    ) -> None:
        """Archivo no-imagen con Content-Type: image/jpeg → 422 (magic bytes lo detectan)."""
        user = make_user()
        override_current_user(user)
        override_entry_service(entry_service)
        try:
            response = await client.post(
                "/api/v1/entries/",
                data={"title": "One Piece", "type": "anime", "status": "watching"},
                files={"cover_image": ("evil.jpg", io.BytesIO(b"<script>alert(1)</script>"), "image/jpeg")},
            )
            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_with_rating_out_of_range(
        self, client: AsyncClient
    ) -> None:
        """Rating fuera de rango vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                    "rating": "10.5",
                },
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_create_with_year_out_of_range(
        self, client: AsyncClient
    ) -> None:
        """Year fuera de rango vía HTTP → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.post(
                "/api/v1/entries/",
                data={
                    "title": "One Piece",
                    "type": "anime",
                    "status": "watching",
                    "year": "2101",
                },
            )

            assert response.status_code == 422
        finally:
            clear_overrides()
