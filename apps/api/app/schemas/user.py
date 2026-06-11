from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr  # Valida formato real de email (requiere email-validator)
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class UserResponse(BaseModel):
    id: UUID
    email: str
    # SEGURIDAD: hashed_password nunca se incluye en este schema.
    # Cualquier campo añadido aquí será visible en las respuestas de la API.
    model_config = ConfigDict(from_attributes=True)
