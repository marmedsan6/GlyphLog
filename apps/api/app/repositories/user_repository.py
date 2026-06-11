from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        raise NotImplementedError

    async def get_by_email(self, email: str) -> User | None:
        raise NotImplementedError

    async def create(self, data: UserCreate, hashed_password: str) -> User:
        raise NotImplementedError
