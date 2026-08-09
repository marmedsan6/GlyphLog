"""Tests de validación Pydantic del schema UserCreate.

Solo dependencias de Pydantic — sin HTTP ni servicios.
"""

import pytest
from pydantic import ValidationError

from app.schemas.user import UserCreate


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
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="bad", password="validpass1")
        assert "formato" in str(exc_info.value).lower()

        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="test@example.com", password="abc")
        assert "contraseña" in str(exc_info.value).lower()

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
