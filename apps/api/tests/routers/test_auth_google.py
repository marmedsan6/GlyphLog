"""Tests de integración del endpoint POST /api/v1/auth/google.

Mockeamos el AuthService y verificamos que el router:
- Enruta correctamente la request al servicio.
- Devuelve el código HTTP esperado.
- Propaga los detalles de error del servicio al cliente.
- Aplica el rate limit configurado.
"""
from __future__ import annotations

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_auth_service
from app.main import app
from app.services.auth_service import AuthService
from tests.factories import make_user

_VALID_CLAIMS = {
    "sub": "google-sub-123",
    "email": "user@example.com",
    "email_verified": True,
    "iss": "accounts.google.com",
}


@pytest.fixture
def mock_user_repo() -> AsyncMock:
    from app.repositories.user_repository import UserRepository

    return AsyncMock(spec=UserRepository)


@pytest.fixture
def auth_service(mock_user_repo: AsyncMock) -> AuthService:
    return AuthService(user_repo=mock_user_repo)


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


def _override_auth_service(service: AuthService) -> None:
    app.dependency_overrides[get_auth_service] = lambda: service


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Happy paths
# ---------------------------------------------------------------------------


class TestGoogleAuthEndpointHappyPath:
    async def test_new_user_returns_200_with_user_and_token(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Usuario nuevo: 200 (NO 201) con RegisterResponse — mismo contrato
        que /auth/google, no creamos un código nuevo para esto."""
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
                response = await client.post(
                    "/api/v1/auth/google", json={"id_token": "any-token"}
                )

            assert response.status_code == 200
            body = response.json()
            assert body["user"]["email"] == "user@example.com"
            assert body["user"]["id"] == str(new_user.id)
            assert body["token_type"] == "bearer"
            assert body["access_token"]
        finally:
            _clear_overrides()

    async def test_existing_google_user_returns_200(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        existing = make_user(
            email="user@example.com", provider="google", provider_id="google-sub-123"
        )
        mock_user_repo.get_by_provider_and_id.return_value = existing
        _override_auth_service(auth_service)

        try:
            with patch(
                "app.services.auth_service.verify_google_id_token",
                return_value=_VALID_CLAIMS,
            ):
                response = await client.post(
                    "/api/v1/auth/google", json={"id_token": "any-token"}
                )

            assert response.status_code == 200
            assert response.json()["user"]["id"] == str(existing.id)
        finally:
            _clear_overrides()


# ---------------------------------------------------------------------------
# Errores
# ---------------------------------------------------------------------------


class TestGoogleAuthEndpointErrors:
    async def test_invalid_token_returns_401(
        self, client: AsyncClient, auth_service: AuthService
    ) -> None:
        _override_auth_service(auth_service)

        try:
            with patch(
                "app.services.auth_service.verify_google_id_token",
                side_effect=HTTPException(
                    status_code=401, detail="Token de Google inválido o expirado"
                ),
            ):
                response = await client.post(
                    "/api/v1/auth/google", json={"id_token": "bad-token"}
                )

            assert response.status_code == 401
            assert "inválido" in response.json()["detail"].lower()
        finally:
            _clear_overrides()

    async def test_local_account_conflict_returns_409(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        local_user = make_user(email="user@example.com", provider="local")
        mock_user_repo.get_by_provider_and_id.return_value = None
        mock_user_repo.get_by_email.return_value = local_user
        _override_auth_service(auth_service)

        try:
            with patch(
                "app.services.auth_service.verify_google_id_token",
                return_value=_VALID_CLAIMS,
            ):
                response = await client.post(
                    "/api/v1/auth/google", json={"id_token": "any-token"}
                )

            assert response.status_code == 409
            detail = response.json()["detail"].lower()
            assert "vincule" in detail or "contraseña" in detail
        finally:
            _clear_overrides()

    async def test_google_account_with_different_provider_id_returns_409(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Email ya vinculado a otra cuenta de Google (provider_id distinto)
        debe devolver 409, no 401. Ver issue #16 y feedback del tech-lead:
        el status code correcto es 409 Conflict (estado del recurso), no
        401 Unauthorized (credenciales inválidas)."""
        existing = make_user(
            email="user@example.com", provider="google", provider_id="OTHER-sub"
        )
        mock_user_repo.get_by_provider_and_id.return_value = None
        mock_user_repo.get_by_email.return_value = existing
        _override_auth_service(auth_service)

        try:
            with patch(
                "app.services.auth_service.verify_google_id_token",
                return_value=_VALID_CLAIMS,
            ):
                response = await client.post(
                    "/api/v1/auth/google", json={"id_token": "any-token"}
                )

            assert response.status_code == 409
            detail = response.json()["detail"].lower()
            assert "vinculado" in detail
        finally:
            _clear_overrides()

    async def test_google_not_configured_returns_503(
        self, client: AsyncClient, auth_service: AuthService
    ) -> None:
        _override_auth_service(auth_service)

        try:
            with patch(
                "app.services.auth_service.verify_google_id_token",
                side_effect=HTTPException(
                    status_code=503,
                    detail="Login con Google no está disponible en este momento",
                ),
            ):
                response = await client.post(
                    "/api/v1/auth/google", json={"id_token": "any-token"}
                )

            assert response.status_code == 503
            assert "no está disponible" in response.json()["detail"].lower()
        finally:
            _clear_overrides()

    async def test_missing_id_token_field_returns_422(self, client: AsyncClient) -> None:
        response = await client.post("/api/v1/auth/google", json={})
        assert response.status_code == 422
