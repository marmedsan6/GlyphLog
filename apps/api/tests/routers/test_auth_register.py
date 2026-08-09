"""Tests de integración del endpoint POST /api/v1/auth/register.

Mockeamos el AuthService y verificamos que el router:
- Enruta correctamente la request al servicio.
- Devuelve el código HTTP esperado.
- Propaga los detalles de error del servicio al cliente.
"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_auth_service
from app.core.security import decode_access_token
from app.main import app
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from tests.factories import make_user


@pytest.fixture
def mock_user_repo() -> AsyncMock:
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


class TestRegisterEndpoint:
    """Tests del endpoint POST /api/v1/auth/register vía HTTP."""

    async def test_register_success(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Criterio #1 y #2: email + contraseña válidos → 201 con user data + token."""
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = make_user()
        _override_auth_service(auth_service)

        try:
            response = await client.post(
                "/api/v1/auth/register",
                json={"email": "test@example.com", "password": "validpass1"},
            )

            assert response.status_code == 201
            body = response.json()
            assert "user" in body
            assert "access_token" in body
            assert body["token_type"] == "bearer"
            assert body["user"]["email"] == "test@example.com"
            assert "id" in body["user"]
        finally:
            _clear_overrides()

    async def test_register_response_excludes_password(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Criterio #2: la respuesta nunca incluye la contraseña."""
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = make_user()
        _override_auth_service(auth_service)

        try:
            response = await client.post(
                "/api/v1/auth/register",
                json={"email": "test@example.com", "password": "validpass1"},
            )

            assert response.status_code == 201
            body = response.json()
            assert "password" not in body
            assert "hashed_password" not in body
            assert "password" not in body["user"]
            assert "hashed_password" not in body["user"]
        finally:
            _clear_overrides()

    async def test_register_token_grants_access(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Criterio #3: el JWT es válido y contiene el user_id como subject."""
        user = make_user()
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = user
        _override_auth_service(auth_service)

        try:
            response = await client.post(
                "/api/v1/auth/register",
                json={"email": "test@example.com", "password": "validpass1"},
            )

            assert response.status_code == 201
            token = response.json()["access_token"]

            payload = decode_access_token(token)
            assert payload["sub"] == str(user.id)
        finally:
            _clear_overrides()

    async def test_register_duplicate_email_http(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Criterio #4: email duplicado vía HTTP → 409 con mensaje en español."""
        mock_user_repo.get_by_email.return_value = make_user()
        _override_auth_service(auth_service)

        try:
            response = await client.post(
                "/api/v1/auth/register",
                json={"email": "test@example.com", "password": "validpass1"},
            )

            assert response.status_code == 409
            assert "ya existe" in response.json()["detail"].lower()
        finally:
            _clear_overrides()

    async def test_register_duplicate_email_case_insensitive_http(
        self, client: AsyncClient, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Criterio #4 y #10: email duplicado con mayúsculas vía HTTP → 409."""
        mock_user_repo.get_by_email.return_value = make_user(email="test@example.com")
        _override_auth_service(auth_service)

        try:
            response = await client.post(
                "/api/v1/auth/register",
                json={"email": "Test@Example.COM", "password": "validpass1"},
            )

            assert response.status_code == 409
            assert "ya existe" in response.json()["detail"].lower()
        finally:
            _clear_overrides()

    async def test_register_invalid_email_http(self, client: AsyncClient) -> None:
        """Criterio #5 y #11: email inválido vía HTTP → 422 con mensaje en español."""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "not-an-email", "password": "validpass1"},
        )

        assert response.status_code == 422
        detail = response.json()["detail"].lower()
        assert "formato" in detail or "email" in detail

    async def test_register_short_password_http(self, client: AsyncClient) -> None:
        """Criterio #6: contraseña corta vía HTTP → 422."""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "abc"},
        )

        assert response.status_code == 422
        assert "8 caracteres" in response.json()["detail"]

    async def test_register_long_password_http(self, client: AsyncClient) -> None:
        """Criterio #7: contraseña larga vía HTTP → 422."""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "a" * 129},
        )

        assert response.status_code == 422
        assert "128 caracteres" in response.json()["detail"]

    async def test_register_spaces_only_password_http(self, client: AsyncClient) -> None:
        """Criterio #8: contraseña solo espacios vía HTTP → 422."""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "        "},
        )

        assert response.status_code == 422
        assert "solo espacios" in response.json()["detail"]
