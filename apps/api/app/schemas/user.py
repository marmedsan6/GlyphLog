from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.validators import normalize_email


class UserCreate(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_and_normalize_email(cls, v: str) -> str:
        return normalize_email(v)

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("La contraseña no puede contener solo espacios")
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if len(v) > 128:
            raise ValueError("La contraseña no puede superar los 128 caracteres")
        return v


class UserResponse(BaseModel):
    id: UUID
    email: str
    # SEGURIDAD: hashed_password nunca se incluye en este schema.
    # Cualquier campo añadido aquí será visible en las respuestas de la API.
    model_config = ConfigDict(from_attributes=True)
