from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class ProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def username_exists(self, username: str) -> bool:
        """Comprueba si el username (case-insensitive) ya está en uso."""
        stmt = select(User.id).where(User.username.ilike(username))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def update_profile(self, user: User, username: str | None, bio: str | None) -> User:
        if username is not None:
            user.username = username
        if bio is not None:
            user.bio = bio
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_avatar(self, user: User, filename: str) -> User:
        user.avatar_filename = filename
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def clear_avatar(self, user: User) -> User:
        user.avatar_filename = None
        await self.db.commit()
        await self.db.refresh(user)
        return user
