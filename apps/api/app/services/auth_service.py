from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterResponse, TokenResponse
from app.schemas.user import UserCreate, UserResponse

# Hash bcrypt dummy para prevenir timing attacks en login.
# Se genera con el mismo coste ($2b$12$) que los hashes reales.
_DUMMY_HASH = "$2b$12$SzVRk9lPDV/CyWEnZKKnGegpfWmxCj4bZh2YBjYwBwU156B9t7.I2"


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def register(self, data: UserCreate) -> RegisterResponse:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una cuenta con este email",
            )

        hashed_password = hash_password(data.password)
        try:
            user = await self.user_repo.create(data, hashed_password)
        except IntegrityError as e:
            # Verificar que el error es por email duplicado (constraint unique de users.email)
            # y no por otra violación de integridad.
            if "users_email_key" in str(e.orig):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe una cuenta con este email",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Error de integridad en los datos",
            )

        access_token = create_access_token(user.id)

        return RegisterResponse(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            token_type="bearer",
        )

    async def login(self, data: LoginRequest) -> TokenResponse:
        # SEGURIDAD: devolver el mismo error si el email no existe
        # o si la contraseña es incorrecta. Previene enumeración de emails.
        unauthorized = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

        user = await self.user_repo.get_by_email(data.email)

        # SEGURIDAD: ejecutar verify_password siempre para prevenir timing attacks.
        # Si el usuario no existe, verificamos contra un hash dummy con coste equivalente.
        hash_to_check = user.hashed_password if user else _DUMMY_HASH

        password_valid = verify_password(data.password, hash_to_check)
        if not user or not password_valid:
            raise unauthorized

        access_token = create_access_token(user.id)
        return TokenResponse(access_token=access_token, token_type="bearer")
