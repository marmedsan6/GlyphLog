from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_provider_and_id(self, provider: str, provider_id: str) -> User | None:
        # Usado en el login OAuth para re-encontrar un usuario ya vinculado.
        # El índice parcial sobre (provider, provider_id) WHERE provider_id
        # IS NOT NULL hace esta consulta O(log n).
        stmt = select(User).where(User.provider == provider, User.provider_id == provider_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: UserCreate, hashed_password: str) -> User:
        # Crea un usuario local (email + contraseña). El provider por defecto
        # es "local" (definido en el modelo).
        user = User(
            email=data.email,
            hashed_password=hashed_password,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def create_oauth_user(self, email: str, provider: str, provider_id: str) -> User:
        # Crea un usuario vinculado a un proveedor OAuth (Google, etc.).
        # El email ya viene normalizado desde el servicio (que a su vez
        # confía en la normalización que Google aplica en sus tokens).
        user = User(
            email=email,
            hashed_password=None,
            provider=provider,
            provider_id=provider_id,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
