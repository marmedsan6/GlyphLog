from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.integrations.bedrock.client import BedrockClient
from app.repositories.ai_repository import AIRepository
from app.repositories.device_token_repository import DeviceTokenRepository
from app.repositories.entry_repository import EntryRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.progress_event_repository import ProgressEventRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.device_token_service import DeviceTokenService
from app.services.entry_service import EntryService
from app.services.external_clients.anilist_client import AniListClient
from app.services.external_clients.rawg_client import RawgClient
from app.services.external_search_service import ExternalSearchService
from app.services.profile_service import ProfileService


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_entry_repository(db: AsyncSession = Depends(get_db)) -> EntryRepository:
    return EntryRepository(db)


def get_progress_event_repository(db: AsyncSession = Depends(get_db)) -> ProgressEventRepository:
    return ProgressEventRepository(db)


def get_device_token_repository(db: AsyncSession = Depends(get_db)) -> DeviceTokenRepository:
    return DeviceTokenRepository(db)


def get_ai_repository(db: AsyncSession = Depends(get_db)) -> AIRepository:
    return AIRepository(db)


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
) -> AuthService:
    return AuthService(user_repo)


def get_entry_service(
    entry_repo: EntryRepository = Depends(get_entry_repository),
    progress_event_repo: ProgressEventRepository = Depends(get_progress_event_repository),
) -> EntryService:
    return EntryService(entry_repo, progress_event_repo)


def get_profile_repository(db: AsyncSession = Depends(get_db)) -> ProfileRepository:
    return ProfileRepository(db)


def get_profile_service(
    profile_repo: ProfileRepository = Depends(get_profile_repository),
) -> ProfileService:
    return ProfileService(profile_repo)


def get_device_token_service(
    device_token_repo: DeviceTokenRepository = Depends(get_device_token_repository),
) -> DeviceTokenService:
    return DeviceTokenService(device_token_repo)


# Instancias singleton para persistencia de la caché en memoria
_anilist_client = AniListClient()
_rawg_client = RawgClient(api_key=settings.rawg_api_key)
_external_search_service = ExternalSearchService(_anilist_client, _rawg_client)


def get_external_search_service() -> ExternalSearchService:
    return _external_search_service


# Cliente de Bedrock singleton para reutilizar conexión
_bedrock_client = BedrockClient(
    model_id=settings.bedrock_model_id,
    region=settings.bedrock_region,
)


def get_bedrock_client() -> BedrockClient:
    return _bedrock_client

