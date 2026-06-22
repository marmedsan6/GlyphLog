from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.entry_repository import EntryRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.entry_service import EntryService


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_entry_repository(db: AsyncSession = Depends(get_db)) -> EntryRepository:
    return EntryRepository(db)


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
) -> AuthService:
    return AuthService(user_repo)


def get_entry_service(
    entry_repo: EntryRepository = Depends(get_entry_repository),
) -> EntryService:
    return EntryService(entry_repo)
