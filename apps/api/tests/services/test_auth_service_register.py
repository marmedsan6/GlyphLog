"""Tests del método AuthService.register.

Mockea el UserRepository — no requiere PostgreSQL.
"""

from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.core.security import verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.services.auth_service import AuthService
from tests.factories import make_user


@pytest.fixture
def mock_user_repo() -> AsyncMock:
    return AsyncMock(spec=UserRepository)


@pytest.fixture
def auth_service(mock_user_repo: AsyncMock) -> AuthService:
    return AuthService(user_repo=mock_user_repo)


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

        _, args, kwargs = mock_user_repo.create.mock_calls[0]
        hashed_pw: str = args[1]
        assert hashed_pw != "validpass1"
        assert hashed_pw.startswith("$2b$")
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
