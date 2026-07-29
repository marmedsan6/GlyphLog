"""Tests de integración del perfil de usuario.

Endpoints:
  GET    /api/v1/users/me
  PATCH  /api/v1/users/me
  POST   /api/v1/users/me/avatar
  DELETE /api/v1/users/me/avatar

Cobertura: autenticación, validaciones y flujos principales.
"""

from io import BytesIO
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient
from PIL import Image

from app.services.profile_service import ProfileService
from tests.factories import (
    clear_overrides,
    client,  # noqa: F401  # fixture compartido
    make_user,
    mock_profile_repo,  # noqa: F401  # fixture compartido
    override_current_user,
    override_profile_service,
    profile_service,  # noqa: F401  # fixture compartido
)


def _make_image_file(filename: str, content: bytes) -> tuple[str, bytes, str]:
    """Devuelve la tupla (field_name, content, content_type) esperada por httpx."""
    return (filename, content, "image/png")


def _make_valid_png() -> bytes:
    """Genera una imagen PNG 1x1 válida usando Pillow."""
    buffer = BytesIO()
    image = Image.new("RGB", (1, 1), color="red")
    image.save(buffer, format="PNG")
    return buffer.getvalue()


VALID_PNG_BYTES = _make_valid_png()


class TestGetProfile:
    """Tests del endpoint GET /api/v1/users/me."""

    async def test_get_profile_success(
        self,
        client: AsyncClient,
        profile_service: ProfileService,
        mock_profile_repo: AsyncMock,
    ) -> None:
        """Usuario autenticado recibe su perfil."""
        user = make_user(username="animefan", bio="Hello world")
        mock_profile_repo.get_by_id.return_value = user
        override_current_user(user)
        override_profile_service(profile_service)

        try:
            response = await client.get("/api/v1/users/me")

            assert response.status_code == 200
            body = response.json()
            assert body["id"] == str(user.id)
            assert body["email"] == user.email
            assert body["username"] == "animefan"
            assert body["bio"] == "Hello world"
            assert body["avatar_url"].startswith("https://api.dicebear.com/")
        finally:
            clear_overrides()

    async def test_get_profile_requires_authentication(self, client: AsyncClient) -> None:
        """Sin token → 401."""
        response = await client.get("/api/v1/users/me")

        assert response.status_code == 401


class TestUpdateProfile:
    """Tests del endpoint PATCH /api/v1/users/me."""

    async def test_update_profile_success(
        self,
        client: AsyncClient,
        profile_service: ProfileService,
        mock_profile_repo: AsyncMock,
    ) -> None:
        """Actualizar username y bio retorna 200."""
        user = make_user()
        updated_user = make_user(
            email=user.email,
            username="new_user",
            bio="Nueva bio",
        )
        updated_user.id = user.id
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.username_exists.return_value = False
        mock_profile_repo.update_profile.return_value = updated_user
        override_current_user(user)
        override_profile_service(profile_service)

        try:
            response = await client.patch(
                "/api/v1/users/me",
                json={"username": "new_user", "bio": "Nueva bio"},
            )

            assert response.status_code == 200
            body = response.json()
            assert body["username"] == "new_user"
            assert body["bio"] == "Nueva bio"
        finally:
            clear_overrides()

    async def test_update_profile_invalid_username(self, client: AsyncClient) -> None:
        """Username con caracteres no permitidos → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.patch(
                "/api/v1/users/me",
                json={"username": "bad-user!"},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_update_profile_username_too_short(self, client: AsyncClient) -> None:
        """Username menor de 3 caracteres → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.patch(
                "/api/v1/users/me",
                json={"username": "ab"},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_update_profile_bio_too_long(self, client: AsyncClient) -> None:
        """Bio mayor de 500 caracteres → 422."""
        user = make_user()
        override_current_user(user)

        try:
            response = await client.patch(
                "/api/v1/users/me",
                json={"bio": "x" * 501},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_update_profile_duplicate_username_returns_409(
        self,
        client: AsyncClient,
        profile_service: ProfileService,
        mock_profile_repo: AsyncMock,
    ) -> None:
        """Username duplicado → 409."""
        user = make_user()
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.username_exists.return_value = True
        override_current_user(user)
        override_profile_service(profile_service)

        try:
            response = await client.patch(
                "/api/v1/users/me",
                json={"username": "taken"},
            )

            assert response.status_code == 409
            assert "ya está en uso" in response.json()["detail"].lower()
        finally:
            clear_overrides()


class TestUploadAvatar:
    """Tests del endpoint POST /api/v1/users/me/avatar."""

    async def test_upload_avatar_success(
        self,
        client: AsyncClient,
        profile_service: ProfileService,
        mock_profile_repo: AsyncMock,
    ) -> None:
        """Subir imagen válida → 200 y avatar_url actualizado."""
        user = make_user()
        updated_user = make_user(
            email=user.email,
            avatar_filename=f"{user.id}.webp",
        )
        updated_user.id = user.id
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.update_avatar.return_value = updated_user
        override_current_user(user)
        override_profile_service(profile_service)

        try:
            response = await client.post(
                "/api/v1/users/me/avatar",
                files={"avatar": _make_image_file("avatar.png", VALID_PNG_BYTES)},
            )

            assert response.status_code == 200
            body = response.json()
            assert body["avatar_url"] == f"/uploads/avatars/{user.id}.webp"
        finally:
            clear_overrides()

    async def test_upload_avatar_invalid_format(
        self,
        client: AsyncClient,
        profile_service: ProfileService,
        mock_profile_repo: AsyncMock,
    ) -> None:
        """Subir archivo no imagen → 422."""
        user = make_user()
        mock_profile_repo.get_by_id.return_value = user
        override_current_user(user)
        override_profile_service(profile_service)

        try:
            response = await client.post(
                "/api/v1/users/me/avatar",
                files={"avatar": _make_image_file("not-image.txt", b"not an image")},
            )

            assert response.status_code == 422
        finally:
            clear_overrides()

    async def test_upload_avatar_requires_authentication(self, client: AsyncClient) -> None:
        """Sin token → 401."""
        response = await client.post(
            "/api/v1/users/me/avatar",
            files={"avatar": _make_image_file("avatar.png", VALID_PNG_BYTES)},
        )

        assert response.status_code == 401


class TestDeleteAvatar:
    """Tests del endpoint DELETE /api/v1/users/me/avatar."""

    async def test_delete_avatar_success(
        self,
        client: AsyncClient,
        profile_service: ProfileService,
        mock_profile_repo: AsyncMock,
    ) -> None:
        """Eliminar avatar → 200 y vuelve a DiceBear."""
        user = make_user(avatar_filename="avatar.webp")
        cleared_user = make_user(email=user.email)
        cleared_user.id = user.id
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.clear_avatar.return_value = cleared_user
        override_current_user(user)
        override_profile_service(profile_service)

        try:
            with patch("app.services.profile_service.delete_avatar_file") as mock_delete:
                response = await client.delete("/api/v1/users/me/avatar")

            assert response.status_code == 200
            body = response.json()
            assert body["avatar_url"].startswith("https://api.dicebear.com/")
            mock_delete.assert_called_once_with("avatar.webp")
        finally:
            clear_overrides()

    async def test_delete_avatar_requires_authentication(self, client: AsyncClient) -> None:
        """Sin token → 401."""
        response = await client.delete("/api/v1/users/me/avatar")

        assert response.status_code == 401
