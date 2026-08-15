from fastapi import Depends
from langchain_aws import ChatBedrock
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.tools import build_agent_tools
from app.core.config import settings
from app.core.database import get_db
from app.integrations.anilist_client import AniListClient
from app.integrations.bedrock.client import BedrockClient
from app.integrations.llm import JsonLlm, OpenAIJsonlClient
from app.integrations.rawg_client import RawgClient
from app.repositories.ai_repository import AIRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.device_token_repository import DeviceTokenRepository
from app.repositories.entry_repository import EntryRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.progress_event_repository import ProgressEventRepository
from app.repositories.user_repository import UserRepository
from app.services.agent_service import AgentService
from app.services.auth_service import AuthService
from app.services.catalog_enrichment_service import CatalogEnrichmentService
from app.services.conversation_service import ConversationService
from app.services.device_token_service import DeviceTokenService
from app.services.entry_service import EntryService
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


def get_conversation_repository(db: AsyncSession = Depends(get_db)) -> ConversationRepository:
    return ConversationRepository(db)


def get_conversation_service(
    conversation_repo: ConversationRepository = Depends(get_conversation_repository),
) -> ConversationService:
    return ConversationService(conversation_repo)


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


# Servicio de enriquecimiento de géneros (reutiliza la caché del catálogo).
_catalog_enrichment_service = CatalogEnrichmentService(_external_search_service)


def get_catalog_enrichment_service() -> CatalogEnrichmentService:
    """Devuelve el servicio de auto-populado de géneros desde el catálogo."""
    return _catalog_enrichment_service


# Cliente de Bedrock singleton para reutilizar conexión.
# Inyecta credenciales explícitas de settings cuando están presentes (el
# contenedor Docker no tiene ~/.aws/credentials). Si no hay credenciales,
# boto3 cae en su cadena por defecto (env vars / perfil local).
_bedrock_client = BedrockClient(
    model_id=settings.bedrock_model_id,
    region=settings.bedrock_region,
    aws_access_key_id=settings.aws_access_key_id or None,
    aws_secret_access_key=settings.aws_secret_access_key or None,
)


def get_bedrock_client() -> BedrockClient:
    """Devuelve el cliente Bedrock singleton (recomendaciones, import, GlyphAI)."""
    return _bedrock_client


def get_llm_client() -> JsonLlm:
    """Devuelve el cliente LLM para generación JSON (recomendaciones e importación).

    El proveedor se elige por entorno:
    - "openai" (dev): reutiliza la API key del chat, sin credenciales AWS.
    - "bedrock" (default, prod): Claude vía AWS con credenciales del entorno.
    """
    if settings.ai_completion_provider == "openai":
        return OpenAIJsonlClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            base_url=settings.openai_base_url or None,
        )
    if settings.ai_completion_provider != "bedrock":
        raise ValueError(
            f"AI_COMPLETION_PROVIDER inválido: {settings.ai_completion_provider!r}. "
            "Usa 'openai' o 'bedrock'."
        )
    return _bedrock_client


# Modelo de chat para el agente de GlyphAI (LangChain). Usa el mismo Claude vía
# Bedrock que recomendaciones/importación. `disable_streaming=False` para que
# LangGraph pueda emitir tokens incrementalmente.
_chat_bedrock = ChatBedrock(
    model_id=settings.bedrock_model_id,
    region_name=settings.bedrock_region,
    aws_access_key_id=settings.aws_access_key_id or None,
    aws_secret_access_key=settings.aws_secret_access_key or None,
)


def get_chat_model() -> ChatBedrock:
    """Devuelve el modelo de chat LangChain para el agente de GlyphAI."""
    return _chat_bedrock


def get_agent_service(
    ai_repository: AIRepository = Depends(get_ai_repository),
    entry_repo: EntryRepository = Depends(get_entry_repository),
    progress_event_repo: ProgressEventRepository = Depends(get_progress_event_repository),
) -> AgentService:
    """Construye el agente de GlyphAI con sus tools y el modelo de chat."""
    entry_service = EntryService(entry_repo, progress_event_repo)
    tools = build_agent_tools(entry_service)
    return AgentService(
        llm=_chat_bedrock,
        tools=tools,
        ai_repository=ai_repository,
    )

