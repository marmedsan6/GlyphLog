from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    username: str | None
    avatar_url: str
    bio: str | None

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=20,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Nombre de usuario público. Alfanumérico + underscore, 3-20 chars.",
    )
    bio: str | None = Field(
        default=None,
        max_length=500,
        description="Biografía pública del usuario. Máximo 500 caracteres.",
    )

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return v.lower()

    @field_validator("bio")
    @classmethod
    def strip_bio(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        # Permitir string vacío explícitamente para limpiar la bio.
        return stripped if stripped else None


class AvatarUploadResponse(BaseModel):
    avatar_url: str
