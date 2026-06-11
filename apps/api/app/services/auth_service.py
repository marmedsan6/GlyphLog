from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def register(self, data: UserCreate) -> UserResponse:
        raise NotImplementedError

    async def login(self, data: LoginRequest) -> TokenResponse:
        # SEGURIDAD: devolver el mismo error si el email no existe
        # o si la contraseña es incorrecta. Previene enumeración de emails.
        raise NotImplementedError
