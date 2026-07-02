from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, field_validator

from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_and_normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        try:
            validated = validate_email(v, check_deliverability=False)
            return validated.normalized
        except EmailNotValidError:
            raise ValueError("El formato del email no es válido")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class GoogleLoginRequest(BaseModel):
    # id_token (JWT) emitido por Google Sign-In en el frontend.
    # El backend lo verifica contra el client_id de la app antes de
    # crear o autenticar al usuario. Nunca se persiste este token.
    id_token: str
