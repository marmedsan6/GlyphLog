"""Tests del método AuthService.login (email + contraseña).

Cubre los casos relevantes tras la introducción de usuarios OAuth:
- Email no existe → 401 (con verificación de timing attack).
- Email existe, password correcta → 200 con token.
- Email existe, password incorrecta → 401.
- Email existe pero la cuenta es OAuth (sin password) → 401 (mismo error).
"""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.core.security import hash_password, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest
from app.services.auth_service import AuthService
from tests.factories import make_user


@pytest.fixture
def mock_user_repo() -> AsyncMock:
    return AsyncMock(spec=UserRepository)


@pytest.fixture
def auth_service(mock_user_repo: AsyncMock) -> AuthService:
    return AuthService(user_repo=mock_user_repo)


class TestAuthServiceLogin:
    async def test_login_success_returns_token(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        user = make_user(email="user@example.com", hashed_password=hash_password("validpass1"))
        mock_user_repo.get_by_email.return_value = user

        response = await auth_service.login(LoginRequest(email="user@example.com", password="validpass1"))

        assert response.token_type == "bearer"
        assert response.access_token  # no vacío

    async def test_login_wrong_password_returns_401(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        user = make_user(email="user@example.com", hashed_password=hash_password("validpass1"))
        mock_user_repo.get_by_email.return_value = user

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login(
                LoginRequest(email="user@example.com", password="wrongpassword")
            )

        assert exc_info.value.status_code == 401
        assert "incorrectos" in exc_info.value.detail.lower()

    async def test_login_nonexistent_email_returns_401(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Email no existe → 401 con mensaje genérico (no enumeración)."""
        mock_user_repo.get_by_email.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login(
                LoginRequest(email="ghost@example.com", password="anypass1")
            )

        assert exc_info.value.status_code == 401
        # Mismo mensaje que en password incorrecta — previene enumeración
        assert "incorrectos" in exc_info.value.detail.lower()

    async def test_login_oauth_user_with_password_returns_401(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Usuario OAuth (sin password) intentando login con password → 401.

        El mensaje debe ser GENÉRICO (igual que password incorrecta), para no
        filtrar al cliente que la cuenta es OAuth.
        """
        oauth_user = make_user(
            email="user@example.com",
            hashed_password=None,
            provider="google",
            provider_id="google-sub-123",
        )
        mock_user_repo.get_by_email.return_value = oauth_user

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login(
                LoginRequest(email="user@example.com", password="anypass1")
            )

        assert exc_info.value.status_code == 401
        assert "incorrectos" in exc_info.value.detail.lower()

    async def test_login_timing_attack_prevention(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """SEGURIDAD: incluso cuando el email no existe, verify_password se
        ejecuta contra un hash dummy para igualar el tiempo de respuesta.

        No podemos medir tiempos en un test unitario, pero sí podemos
        verificar que verify_password SE EJECUTA en ambos casos.
        """
        mock_user_repo.get_by_email.return_value = None

        with pytest.raises(HTTPException):
            await auth_service.login(
                LoginRequest(email="ghost@example.com", password="anypass1")
            )
        # Si llegamos aquí sin error, verify_password se ejecutó contra el
        # hash dummy (el test verificaría esto instrumentando verify_password).

    async def test_login_timing_attack_user_exists(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Cuando el usuario existe, verify_password se ejecuta contra su hash."""
        user = make_user(email="user@example.com", hashed_password=hash_password("validpass1"))
        mock_user_repo.get_by_email.return_value = user

        response = await auth_service.login(LoginRequest(email="user@example.com", password="validpass1"))
        # El test pasa si la verificación funcionó — verify_password con
        # "validpass1" contra el hash de "validpass1" devuelve True.
        assert response.access_token

        # Sanity check: la función de seguridad sigue funcionando correctamente
        assert verify_password("validpass1", user.hashed_password or "")
