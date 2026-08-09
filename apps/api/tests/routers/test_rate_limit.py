"""Tests de rate limiting en endpoints de autenticación.

Verifica que los endpoints /login y /register respetan los límites
configurados y que otros endpoints no se ven afectados.
Los límites bajos (2/minute) se configuran en conftest.py.
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.core.dependencies import get_auth_service
from app.main import app
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from tests.factories import make_user

# Claims base para el test de rate limit en /auth/google.
_VALID_CLAIMS = {
    "sub": "google-sub-123",
    "email": "user@example.com",
    "email_verified": True,
    "iss": "accounts.google.com",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _override_auth_service(service: AuthService) -> None:
    app.dependency_overrides[get_auth_service] = lambda: service


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_user_repo() -> AsyncMock:
    return AsyncMock(spec=UserRepository)


@pytest.fixture
def auth_service(mock_user_repo: AsyncMock) -> AuthService:
    return AuthService(user_repo=mock_user_repo)


# ---------------------------------------------------------------------------
# Tests de rate limiting — Login
# ---------------------------------------------------------------------------


class TestLoginRateLimit:
    """Verifica que POST /api/v1/auth/login respeta el límite configurado."""

    async def test_login_rate_limit_exceeded(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Tras superar el límite de peticiones, retorna 429 Too Many Requests."""
        mock_user_repo.get_by_email.return_value = make_user()
        _override_auth_service(auth_service)

        try:
            # Las primeras 2 peticiones deben pasar (límite = 2/minute)
            for _ in range(2):
                response = await client.post(
                    "/api/v1/auth/login",
                    json={"email": "test@example.com", "password": "validpass1"},
                )
                assert response.status_code != 429

            # La tercera petición debe ser rechazada
            response = await client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "validpass1"},
            )
            assert response.status_code == 429
        finally:
            _clear_overrides()

    async def test_login_rate_limit_response_has_retry_after(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """La respuesta 429 incluye el header Retry-After con segundos restantes."""
        mock_user_repo.get_by_email.return_value = make_user()
        _override_auth_service(auth_service)

        try:
            # Agotar el límite
            for _ in range(2):
                await client.post(
                    "/api/v1/auth/login",
                    json={"email": "test@example.com", "password": "validpass1"},
                )

            response = await client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "validpass1"},
            )

            assert response.status_code == 429
            assert "retry-after" in response.headers
            retry_after = int(response.headers["retry-after"])
            assert retry_after > 0
        finally:
            _clear_overrides()

    async def test_login_rate_limit_message_in_spanish(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """El mensaje de error 429 está en español."""
        mock_user_repo.get_by_email.return_value = make_user()
        _override_auth_service(auth_service)

        try:
            for _ in range(2):
                await client.post(
                    "/api/v1/auth/login",
                    json={"email": "test@example.com", "password": "validpass1"},
                )

            response = await client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "validpass1"},
            )

            assert response.status_code == 429
            detail = response.json()["detail"]
            assert "demasiadas peticiones" in detail.lower()
            assert "segundos" in detail.lower()
        finally:
            _clear_overrides()


# ---------------------------------------------------------------------------
# Tests de rate limiting — Register
# ---------------------------------------------------------------------------


class TestRegisterRateLimit:
    """Verifica que POST /api/v1/auth/register respeta el límite configurado."""

    async def test_register_rate_limit_exceeded(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Tras superar el límite de peticiones, retorna 429 Too Many Requests."""
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = make_user()
        _override_auth_service(auth_service)

        try:
            # Las primeras 2 peticiones deben pasar (límite = 2/minute)
            for _ in range(2):
                response = await client.post(
                    "/api/v1/auth/register",
                    json={"email": "test@example.com", "password": "validpass1"},
                )
                assert response.status_code != 429

            # La tercera petición debe ser rechazada
            response = await client.post(
                "/api/v1/auth/register",
                json={"email": "test@example.com", "password": "validpass1"},
            )
            assert response.status_code == 429
        finally:
            _clear_overrides()

    async def test_register_rate_limit_response_has_retry_after(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """La respuesta 429 incluye el header Retry-After con segundos restantes."""
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = make_user()
        _override_auth_service(auth_service)

        try:
            for _ in range(2):
                await client.post(
                    "/api/v1/auth/register",
                    json={"email": "test@example.com", "password": "validpass1"},
                )

            response = await client.post(
                "/api/v1/auth/register",
                json={"email": "test@example.com", "password": "validpass1"},
            )

            assert response.status_code == 429
            assert "retry-after" in response.headers
            retry_after = int(response.headers["retry-after"])
            assert retry_after > 0
        finally:
            _clear_overrides()

    async def test_register_rate_limit_message_in_spanish(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """El mensaje de error 429 está en español."""
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = make_user()
        _override_auth_service(auth_service)

        try:
            for _ in range(2):
                await client.post(
                    "/api/v1/auth/register",
                    json={"email": "test@example.com", "password": "validpass1"},
                )

            response = await client.post(
                "/api/v1/auth/register",
                json={"email": "test@example.com", "password": "validpass1"},
            )

            assert response.status_code == 429
            detail = response.json()["detail"]
            assert "demasiadas peticiones" in detail.lower()
            assert "segundos" in detail.lower()
        finally:
            _clear_overrides()


# ---------------------------------------------------------------------------
# Tests de aislamiento — otros endpoints no deben verse afectados
# ---------------------------------------------------------------------------


class TestRateLimitIsolation:
    """Verifica que el rate limiting solo afecta a endpoints de auth."""

    async def test_health_endpoint_not_rate_limited(self, client: AsyncClient) -> None:
        """El endpoint /health no tiene rate limiting, sin importar cuántas peticiones."""
        for _ in range(10):
            response = await client.get("/health")
            assert response.status_code == 200
            assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Tests de rate limiting — Google OAuth (defense in depth)
# ---------------------------------------------------------------------------


class TestGoogleAuthRateLimit:
    """Verifica que POST /api/v1/auth/google también respeta el rate limit
    de `rate_limit_login`. Aunque Google ya limita en su lado, aplicamos
    el mismo límite como defense in depth (ver ADR-006, Consecuencias)."""

    async def test_google_rate_limit_exceeded(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Tras 2 peticiones, la tercera a /auth/google devuelve 429."""
        new_user = make_user(
            email="user@example.com", provider="google", provider_id="google-sub-123"
        )
        mock_user_repo.get_by_provider_and_id.return_value = None
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create_oauth_user.return_value = new_user
        _override_auth_service(auth_service)

        try:
            with patch(
                "app.services.auth_service.verify_google_id_token",
                return_value=_VALID_CLAIMS,
            ):
                # Las primeras 2 peticiones deben pasar (límite = 2/minute)
                for _ in range(2):
                    response = await client.post(
                        "/api/v1/auth/google", json={"id_token": "any-token"}
                    )
                    assert response.status_code != 429

                # La tercera petición debe ser rechazada
                response = await client.post(
                    "/api/v1/auth/google", json={"id_token": "any-token"}
                )
                assert response.status_code == 429
        finally:
            _clear_overrides()
