"""Tests unitarios de ProfileService.

Cobertura: get_profile, update_profile, upload_avatar y delete_avatar con
repositorio mockeado. No requieren PostgreSQL corriendo.
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.schemas.profile import UserProfileUpdate
from app.services.profile_service import ProfileService
from tests.factories import (
    make_user,
    mock_profile_repo,  # noqa: F401  # fixture compartido
    profile_service,  # noqa: F401  # fixture compartido
)


class TestProfileServiceGetProfile:
    """Lógica de negocio de consultar el perfil."""

    async def test_get_profile_success(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Consultar perfil existente retorna UserProfileResponse."""
        user = make_user(username="gamerone", bio="Me gustan los JRPG")
        mock_profile_repo.get_by_id.return_value = user

        result = await profile_service.get_profile(user.id)

        assert result.id == user.id
        assert result.email == user.email
        assert result.username == "gamerone"
        assert result.bio == "Me gustan los JRPG"
        assert result.avatar_url.startswith("https://api.dicebear.com/")
        mock_profile_repo.get_by_id.assert_awaited_once_with(user.id)

    async def test_get_profile_with_avatar_returns_uploaded_url(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Si el usuario tiene avatar subido, se devuelve la ruta relativa."""
        user = make_user(avatar_filename=f"{uuid4()}.webp")
        mock_profile_repo.get_by_id.return_value = user

        result = await profile_service.get_profile(user.id)

        assert result.avatar_url == f"/uploads/avatars/{user.avatar_filename}"

    async def test_get_profile_not_found_raises_404(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Consultar perfil inexistente → 404."""
        mock_profile_repo.get_by_id.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await profile_service.get_profile(uuid4())

        assert exc_info.value.status_code == 404


class TestProfileServiceUpdateProfile:
    """Lógica de negocio de actualizar el perfil."""

    async def test_update_profile_success(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Actualizar username y bio retorna el perfil actualizado."""
        user = make_user()
        updated_user = make_user(
            email=user.email,
            username="newuser",
            bio="Nueva bio",
        )
        # Forzar mismo id para que la comparación de username sea consistente
        updated_user.id = user.id
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.username_exists.return_value = False
        mock_profile_repo.update_profile.return_value = updated_user

        data = UserProfileUpdate(username="NewUser", bio="Nueva bio")
        result = await profile_service.update_profile(user.id, data)

        assert result.username == "newuser"
        assert result.bio == "Nueva bio"
        mock_profile_repo.username_exists.assert_awaited_once_with("newuser")
        mock_profile_repo.update_profile.assert_awaited_once_with(
            user=user, username="newuser", bio="Nueva bio"
        )

    async def test_update_profile_username_same_value_skips_check(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Si el username no cambia, no se verifica unicidad."""
        user = make_user(username="sameuser")
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.update_profile.return_value = user

        data = UserProfileUpdate(username="sameuser")
        await profile_service.update_profile(user.id, data)

        mock_profile_repo.username_exists.assert_not_awaited()

    async def test_update_profile_duplicate_username_raises_409(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Username ya en uso → 409."""
        user = make_user(username="olduser")
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.username_exists.return_value = True

        data = UserProfileUpdate(username="taken")
        with pytest.raises(HTTPException) as exc_info:
            await profile_service.update_profile(user.id, data)

        assert exc_info.value.status_code == 409
        assert "ya está en uso" in exc_info.value.detail.lower()
        mock_profile_repo.update_profile.assert_not_awaited()

    async def test_update_profile_only_bio(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Actualizar solo bio no modifica el username."""
        user = make_user(username="gamer")
        updated_user = make_user(email=user.email, username="gamer", bio="Solo bio")
        updated_user.id = user.id
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.update_profile.return_value = updated_user

        data = UserProfileUpdate(bio="Solo bio")
        result = await profile_service.update_profile(user.id, data)

        assert result.username == "gamer"
        assert result.bio == "Solo bio"
        mock_profile_repo.update_profile.assert_awaited_once_with(
            user=user, username=None, bio="Solo bio"
        )

    async def test_update_profile_clear_bio(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Enviar bio vacía la limpia (None)."""
        user = make_user(username="gamer", bio="Old bio")
        updated_user = make_user(email=user.email, username="gamer", bio=None)
        updated_user.id = user.id
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.update_profile.return_value = updated_user

        data = UserProfileUpdate(bio="   ")
        result = await profile_service.update_profile(user.id, data)

        assert result.bio is None
        mock_profile_repo.update_profile.assert_awaited_once_with(
            user=user, username=None, bio=None
        )


class TestProfileServiceUploadAvatar:
    """Lógica de negocio de subir avatar."""

    async def test_upload_avatar_success(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Subir avatar válido retorna la nueva URL."""
        user = make_user()
        updated_user = make_user(
            email=user.email,
            avatar_filename=f"{user.id}.webp",
        )
        updated_user.id = user.id
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.update_avatar.return_value = updated_user

        mock_file = AsyncMock()
        with patch(
            "app.services.profile_service.save_avatar",
            return_value=f"/uploads/avatars/{user.id}.webp",
        ) as mock_save:
            result = await profile_service.upload_avatar(user.id, mock_file)

        assert result.avatar_url == f"/uploads/avatars/{user.id}.webp"
        mock_save.assert_awaited_once_with(mock_file, user.id)
        mock_profile_repo.update_avatar.assert_awaited_once()

    async def test_upload_avatar_replaces_existing(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Subir avatar nuevo elimina el anterior del disco."""
        user = make_user(avatar_filename="old.webp")
        updated_user = make_user(
            email=user.email,
            avatar_filename=f"{user.id}.webp",
        )
        updated_user.id = user.id
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.update_avatar.return_value = updated_user

        mock_file = AsyncMock()
        with patch("app.services.profile_service.delete_avatar_file") as mock_delete, patch(
            "app.services.profile_service.save_avatar",
            return_value=f"/uploads/avatars/{user.id}.webp",
        ):
            await profile_service.upload_avatar(user.id, mock_file)

        mock_delete.assert_called_once_with("old.webp")


class TestProfileServiceDeleteAvatar:
    """Lógica de negocio de eliminar avatar."""

    async def test_delete_avatar_success(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Eliminar avatar existente limpia el archivo y vuelve a DiceBear."""
        user = make_user(avatar_filename="avatar.webp")
        cleared_user = make_user(email=user.email)
        cleared_user.id = user.id
        mock_profile_repo.get_by_id.return_value = user
        mock_profile_repo.clear_avatar.return_value = cleared_user

        with patch("app.services.profile_service.delete_avatar_file") as mock_delete:
            result = await profile_service.delete_avatar(user.id)

        assert result.avatar_url.startswith("https://api.dicebear.com/")
        mock_delete.assert_called_once_with("avatar.webp")
        mock_profile_repo.clear_avatar.assert_awaited_once_with(user)

    async def test_delete_avatar_when_none_does_nothing(
        self, profile_service: ProfileService, mock_profile_repo: AsyncMock
    ) -> None:
        """Eliminar avatar cuando no hay archivo no falla."""
        user = make_user()
        mock_profile_repo.get_by_id.return_value = user

        with patch("app.services.profile_service.delete_avatar_file") as mock_delete:
            result = await profile_service.delete_avatar(user.id)

        assert result.avatar_url.startswith("https://api.dicebear.com/")
        mock_delete.assert_not_called()
        mock_profile_repo.clear_avatar.assert_not_awaited()
