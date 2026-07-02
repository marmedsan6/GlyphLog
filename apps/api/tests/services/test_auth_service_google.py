"""Tests del servicio de AuthService.login_or_register_with_google.

Estrategia: se mockea `verify_google_id_token` (la única función con
dependencia externa) y el `UserRepository` (capa de BD). Esto aísla
totalmente la lógica de orquestación — qué pasa si el email ya existe,
qué provider tiene, qué error HTTP se devuelve — sin tocar la red
ni la BD.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from app.core.google_auth import GoogleAuthError
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from tests.factories import make_user

# Claims base para tokens de Google válidos en estos tests.
# El id_token real nunca se valida — mockeamos verify_google_id_token.
_VALID_CLAIMS = {
    "sub": "google-sub-123",
    "email": "user@example.com",
    "email_verified": True,
    "iss": "accounts.google.com",
}


@pytest.fixture
def mock_user_repo() -> AsyncMock:
    return AsyncMock(spec=UserRepository)


@pytest.fixture
def auth_service(mock_user_repo: AsyncMock) -> AuthService:
    return AuthService(user_repo=mock_user_repo)


def _patch_verify(claims: dict | None = None, error: Exception | None = None):
    """Helper: parchea verify_google_id_token para que devuelva `claims`
    o lance `error`."""
    if error is not None:
        return patch(
            "app.services.auth_service.verify_google_id_token",
            side_effect=error,
        )
    return patch(
        "app.services.auth_service.verify_google_id_token",
        return_value=claims,
    )


# ---------------------------------------------------------------------------
# Casos felices: nuevo usuario y usuario existente vinculado
# ---------------------------------------------------------------------------


class TestLoginOrRegisterWithGoogleHappyPath:
    async def test_creates_new_user_when_email_does_not_exist(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Email nuevo → crea usuario OAuth y devuelve token."""
        new_user = make_user(
            email="new@example.com", provider="google", provider_id="google-sub-123"
        )
        mock_user_repo.get_by_provider_and_id.return_value = None
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create_oauth_user.return_value = new_user

        with _patch_verify(_VALID_CLAIMS):
            response = await auth_service.login_or_register_with_google("any-token")

        assert response.user.email == "new@example.com"
        assert response.user.id == new_user.id
        assert response.token_type == "bearer"
        assert response.access_token  # no vacío

        # Verificamos que create_oauth_user se llamó con los argumentos correctos
        mock_user_repo.create_oauth_user.assert_awaited_once_with(
            email="user@example.com",
            provider="google",
            provider_id="google-sub-123",
        )

    async def test_existing_google_user_logs_in(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Usuario con provider=google y provider_id coincidente → login directo."""
        existing = make_user(
            email="user@example.com", provider="google", provider_id="google-sub-123"
        )
        mock_user_repo.get_by_provider_and_id.return_value = existing

        with _patch_verify(_VALID_CLAIMS):
            response = await auth_service.login_or_register_with_google("any-token")

        assert response.user.id == existing.id
        # No debe intentar crear ni buscar por email en este caso
        mock_user_repo.get_by_email.assert_not_awaited()
        mock_user_repo.create_oauth_user.assert_not_awaited()

    async def test_email_is_normalized_to_lowercase(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Si Google devuelve email con mayúsculas, se normaliza a lowercase
        antes de consultar/crear — igual que en el registro local."""
        new_user = make_user(
            email="user@example.com",
            provider="google",
            provider_id="google-sub-123",
        )
        mock_user_repo.get_by_provider_and_id.return_value = None
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create_oauth_user.return_value = new_user

        with _patch_verify({**_VALID_CLAIMS, "email": "User@Example.com"}):
            await auth_service.login_or_register_with_google("any-token")

        _, kwargs = mock_user_repo.create_oauth_user.call_args
        assert kwargs["email"] == "user@example.com"


# ---------------------------------------------------------------------------
# Conflictos: email existe con otro provider / provider_id distinto
# ---------------------------------------------------------------------------


class TestLoginOrRegisterWithGoogleConflicts:
    async def test_existing_local_user_raises_409(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Email existe con provider=local → 409, NO se vincula automáticamente."""
        local_user = make_user(email="user@example.com", provider="local")
        mock_user_repo.get_by_provider_and_id.return_value = None
        mock_user_repo.get_by_email.return_value = local_user

        with _patch_verify(_VALID_CLAIMS):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_or_register_with_google("any-token")

        assert exc_info.value.status_code == 409
        assert "vincule" in exc_info.value.detail.lower() or "contraseña" in exc_info.value.detail.lower()
        # Nunca se debe crear un usuario OAuth si la cuenta es local
        mock_user_repo.create_oauth_user.assert_not_awaited()

    async def test_google_user_with_different_provider_id_raises_409(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Email existe con provider=google pero provider_id distinto → 409
        (señal de cuenta comprometida o reconfigurada). Ver issue #16:
        el spec exige 409, no 401, porque el problema es de estado del
        recurso (email ya vinculado a otra cuenta), no de credenciales."""
        existing = make_user(
            email="user@example.com", provider="google", provider_id="OTHER-sub"
        )
        mock_user_repo.get_by_provider_and_id.return_value = None  # primer lookup falla
        mock_user_repo.get_by_email.return_value = existing  # segundo lookup encuentra

        with _patch_verify(_VALID_CLAIMS):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_or_register_with_google("any-token")

        assert exc_info.value.status_code == 409
        assert "vinculado" in exc_info.value.detail.lower()

    async def test_race_condition_on_create_retries_via_get_by_email(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Si dos requests concurrentes intentan crear el mismo email, el
        segundo recibe IntegrityError y debe recuperarse re-leyendo."""
        from sqlalchemy.exc import IntegrityError

        existing_after_race = make_user(
            email="user@example.com", provider="google", provider_id="google-sub-123"
        )
        mock_user_repo.get_by_provider_and_id.return_value = None
        mock_user_repo.get_by_email.side_effect = [None, existing_after_race]
        mock_user_repo.create_oauth_user.side_effect = IntegrityError(
            statement="INSERT...",
            params={},
            orig=Exception('duplicate key value violates unique constraint "users_email_key"'),
        )

        with _patch_verify(_VALID_CLAIMS):
            response = await auth_service.login_or_register_with_google("any-token")

        # Se recupera usando el email del otro request concurrente
        assert response.user.id == existing_after_race.id


# ---------------------------------------------------------------------------
# Errores de validación del token (delegados a GoogleAuthError)
# ---------------------------------------------------------------------------


class TestLoginOrRegisterWithGoogleTokenErrors:
    async def test_token_invalid_returns_401(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        err = GoogleAuthError(reason="invalid_token", message="Token de Google inválido o expirado")
        with _patch_verify(error=err):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_or_register_with_google("any-token")

        assert exc_info.value.status_code == 401
        assert "inválido" in exc_info.value.detail.lower() or "expirado" in exc_info.value.detail.lower()
        # Nunca se debe tocar la BD si el token no es válido
        mock_user_repo.get_by_provider_and_id.assert_not_awaited()
        mock_user_repo.create_oauth_user.assert_not_awaited()

    async def test_email_not_verified_returns_401(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        err = GoogleAuthError(
            reason="email_not_verified",
            message="El email de la cuenta Google no está verificado",
        )
        with _patch_verify(error=err):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_or_register_with_google("any-token")

        assert exc_info.value.status_code == 401
        assert "no está verificado" in exc_info.value.detail.lower()

    async def test_invalid_issuer_returns_401(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        err = GoogleAuthError(reason="invalid_issuer", message="Token de Google inválido o expirado")
        with _patch_verify(error=err):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_or_register_with_google("any-token")

        assert exc_info.value.status_code == 401

    async def test_google_not_configured_returns_503(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Sin GOOGLE_CLIENT_ID el endpoint debe responder 503 (modo degradado)."""
        err = GoogleAuthError(
            reason="not_configured",
            message="Login con Google no está disponible en este momento",
        )
        with _patch_verify(error=err):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_or_register_with_google("any-token")

        assert exc_info.value.status_code == 503
        assert "no está disponible" in exc_info.value.detail.lower()
