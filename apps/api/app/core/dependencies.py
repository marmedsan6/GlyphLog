from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.repositories.entry_repository import EntryRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.entry_service import EntryService
from app.services.external_clients.anilist_client import AniListClient
from app.services.external_clients.rawg_client import RawgClient
from app.services.external_search_service import ExternalSearchService


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


# Instancias singleton para persistencia de la caché en memoria
_anilist_client = AniListClient()
_rawg_client = RawgClient(api_key=settings.rawg_api_key)
_external_search_service = ExternalSearchService(_anilist_client, _rawg_client)


def get_external_search_service() -> ExternalSearchService:
    return _external_search_service
