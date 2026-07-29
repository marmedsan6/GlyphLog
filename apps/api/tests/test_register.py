"""Tests del endpoint de registro de usuario.

Cobertura: validación de schemas, lógica del servicio e integración HTTP.
Todos los tests usan mocks — no requieren PostgreSQL corriendo.
"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import get_auth_service
from app.core.security import decode_access_token, verify_password
from app.main import app
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.services.auth_service import AuthService
from tests.factories import make_user

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Tests de schema — validación directa de UserCreate (sin HTTP ni servicio)
# ---------------------------------------------------------------------------


class TestUserCreateSchema:
    """Validaciones de Pydantic sobre el schema UserCreate."""

    def test_register_email_normalized_to_lowercase(self) -> None:
        """Criterio #10: el email se normaliza a lowercase antes de almacenarse."""
        data = UserCreate(email="  Test.User@Example.COM  ", password="validpass1")
        assert data.email == "test.user@example.com"

    def test_register_invalid_email(self) -> None:
        """Criterio #5 y #11: email inválido → ValidationError con mensaje en español."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="not-an-email", password="validpass1")
        error_str = str(exc_info.value).lower()
        assert "formato del email" in error_str or "formato" in error_str

    def test_register_invalid_email_no_at(self) -> None:
        """Email sin @ también debe rechazarse con mensaje en español."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="userexample.com", password="validpass1")
        assert "formato" in str(exc_info.value).lower()

    def test_register_short_password(self) -> None:
        """Criterio #6: contraseña < 8 chars → ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="test@example.com", password="abc")
        assert "8 caracteres" in str(exc_info.value)

    def test_register_long_password(self) -> None:
        """Criterio #7: contraseña > 128 chars → ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="test@example.com", password="a" * 129)
        assert "128 caracteres" in str(exc_info.value)

    def test_register_spaces_only_password(self) -> None:
        """Criterio #8: contraseña solo espacios → ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="test@example.com", password="        ")
        assert "solo espacios" in str(exc_info.value)

    def test_register_error_messages_in_spanish(self) -> None:
        """Criterio #11: todos los mensajes de error de validación están en español."""
        # Email inválido
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="bad", password="validpass1")
        assert "formato" in str(exc_info.value).lower()

        # Contraseña corta
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="test@example.com", password="abc")
        assert "contraseña" in str(exc_info.value).lower()

        # Contraseña solo espacios
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="test@example.com", password="        ")
        assert "espacios" in str(exc_info.value).lower()

    def test_register_duplicate_email_case_insensitive(self) -> None:
        """Criterio #4 y #10: variaciones de mayúsculas normalizan al mismo lowercase."""
        data1 = UserCreate(email="Test@Example.COM", password="validpass1")
        data2 = UserCreate(email="test@example.com", password="validpass1")
        assert data1.email == data2.email == "test@example.com"

    def test_valid_password_exactly_8_chars(self) -> None:
        """Contraseña de exactamente 8 chars debe ser válida."""
        data = UserCreate(email="test@example.com", password="12345678")
        assert data.password == "12345678"

    def test_valid_password_exactly_128_chars(self) -> None:
        """Contraseña de exactamente 128 chars debe ser válida."""
        data = UserCreate(email="test@example.com", password="a" * 128)
        assert data.password == "a" * 128


# ---------------------------------------------------------------------------
# Tests del servicio — AuthService con repositorio mockeado
# ---------------------------------------------------------------------------


class TestAuthServiceRegister:
    """Lógica de negocio del registro en AuthService."""

    async def test_register_password_stored_as_hash(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Criterio #9: la contraseña se almacena como hash bcrypt, nunca en texto plano."""
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = make_user()

        data = UserCreate(email="test@example.com", password="validpass1")
        await auth_service.register(data)

        # Verificar que create() recibió un hash bcrypt, no la contraseña en claro
        _, args, kwargs = mock_user_repo.create.mock_calls[0]
        hashed_pw: str = args[1]
        assert hashed_pw != "validpass1"
        assert hashed_pw.startswith("$2b$")
        # El hash debe verificar correctamente contra la contraseña original
        assert verify_password("validpass1", hashed_pw)

    async def test_register_duplicate_email_raises_409(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """Criterio #4: email duplicado detectado por get_by_email → 409."""
        mock_user_repo.get_by_email.return_value = make_user()

        data = UserCreate(email="test@example.com", password="validpass1")
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.register(data)
        assert exc_info.value.status_code == 409
        assert "ya existe" in exc_info.value.detail.lower()

    async def test_register_integrity_error_email_constraint(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """IntegrityError por users_email_key (race condition) → 409 específico."""
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.side_effect = IntegrityError(
            statement="INSERT INTO users ...",
            params={},
            orig=Exception('duplicate key value violates unique constraint "users_email_key"'),
        )

        data = UserCreate(email="test@example.com", password="validpass1")
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.register(data)
        assert exc_info.value.status_code == 409
        assert "ya existe" in exc_info.value.detail.lower()

    async def test_register_integrity_error_other_constraint(
        self, auth_service: AuthService, mock_user_repo: AsyncMock
    ) -> None:
        """IntegrityError por otra constraint → 409 genérico (no enmascara)."""
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.side_effect = IntegrityError(
            statement="INSERT INTO users ...",
            params={},
            orig=Exception('violates other constraint "some_other_key"'),
        )

        data = UserCreate(email="test@example.com", password="validpass1")
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.register(data)
        assert exc_info.value.status_code == 409
        assert "integridad" in exc_info.value.detail.lower()


# ---------------------------------------------------------------------------
# Tests de integración HTTP — endpoint completo con dependencias mockeadas
# ---------------------------------------------------------------------------


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
            # Estructura de la respuesta
            assert "user" in body
            assert "access_token" in body
            assert body["token_type"] == "bearer"
            # Datos del usuario
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
            # La contraseña no debe aparecer en ningún nivel de la respuesta
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

            # El token debe ser decodificable y contener el user_id correcto
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
