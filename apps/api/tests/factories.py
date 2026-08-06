"""Factories y utilidades compartidas para tests del backend.

No dependen de una base de datos real: crean instancias en memoria y
facilitan el override de dependencias de FastAPI durante tests de integración.
"""

from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.dependencies import get_entry_service, get_profile_service
from app.core.security import (
    AuthenticatedUser,
    get_current_user,
    get_current_user_flexible,
    hash_password,
)
from app.main import app
from app.models.conversation import ChatMessage, Conversation
from app.models.entry import Entry, EntryStatus, EntryType
from app.models.user import User
from app.repositories.entry_repository import EntryRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.progress_event_repository import ProgressEventRepository
from app.services.entry_service import EntryService
from app.services.profile_service import ProfileService


def make_entry(
    entry_id: UUID | None = None,
    user_id: UUID | None = None,
    title: str = "One Piece",
    entry_type: EntryType = EntryType.anime,
    entry_status: EntryStatus = EntryStatus.watching,
    rating: float | None = None,
    year: int | None = None,
    notes: str | None = None,
    cover_image: str | None = None,
    progress_unit: str | None = None,
    progress_total: float | None = None,
    current_progress: float | None = None,
    created_at: datetime | None = None,
    updated_at: datetime | None = None,
) -> Entry:
    """Crea una instancia de Entry en memoria (sin sesión de BD)."""
    now = datetime.now(timezone.utc)
    return Entry(
        id=entry_id or uuid4(),
        user_id=user_id or uuid4(),
        title=title,
        type=entry_type,
        status=entry_status,
        rating=rating,
        year=year,
        notes=notes,
        cover_image=cover_image,
        progress_unit=progress_unit,
        progress_total=progress_total,
        current_progress=current_progress,
        created_at=created_at or now,
        updated_at=updated_at or now,
    )


def make_user(
    email: str = "test@example.com",
    hashed_password: str | None = None,
    provider: str = "local",
    provider_id: str | None = None,
    username: str | None = None,
    avatar_filename: str | None = None,
    bio: str | None = None,
) -> User:
    """Crea una instancia de User en memoria para simular autenticación."""
    return User(
        id=uuid4(),
        email=email,
        hashed_password=hashed_password or hash_password("validpass1"),
        provider=provider,
        provider_id=provider_id,
        username=username,
        avatar_filename=avatar_filename,
        bio=bio,
    )


def make_conversation(
    conversation_id: UUID | None = None,
    user_id: UUID | None = None,
    title: str = "Test conversación",
    created_at: datetime | None = None,
    updated_at: datetime | None = None,
) -> Conversation:
    """Crea una instancia de Conversation en memoria (sin sesión de BD)."""
    now = datetime.now(timezone.utc)
    return Conversation(
        id=conversation_id or uuid4(),
        user_id=user_id or uuid4(),
        title=title,
        created_at=created_at or now,
        updated_at=updated_at or now,
    )


def make_chat_message(
    conversation_id: UUID,
    role: str = "user",
    content: str = "Hola",
    message_id: UUID | None = None,
    created_at: datetime | None = None,
) -> ChatMessage:
    """Crea una instancia de ChatMessage en memoria (sin sesión de BD)."""
    return ChatMessage(
        id=message_id or uuid4(),
        conversation_id=conversation_id,
        role=role,
        content=content,
        created_at=created_at or datetime.now(timezone.utc),
    )


@pytest.fixture
def mock_entry_repo() -> AsyncMock:
    return AsyncMock(spec=EntryRepository)


@pytest.fixture
def entry_service(mock_entry_repo: AsyncMock) -> EntryService:
    progress_event_repo = AsyncMock(spec=ProgressEventRepository)
    progress_event_repo.has_events.return_value = False
    return EntryService(
        entry_repo=mock_entry_repo,
        progress_event_repo=progress_event_repo,
    )


@pytest.fixture
def mock_profile_repo() -> AsyncMock:
    return AsyncMock(spec=ProfileRepository)


@pytest.fixture
def profile_service(mock_profile_repo: AsyncMock) -> ProfileService:
    return ProfileService(profile_repo=mock_profile_repo)


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


def override_current_user(user: User, source: str = "web") -> None:
    """Override tanto para JWT-only como para auth flexible.

    Útil en tests JWT donde se accede a endpoints protegidos por get_current_user.
    """
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_user_flexible] = lambda: AuthenticatedUser(
        user=user, source=source
    )


def override_current_user_flexible(user: User, source: str = "web") -> None:
    """Override solo para auth flexible, dejando get_current_user (JWT-only) real.

    Útil en tests de device token para verificar que endpoints JWT-only rechazan
    tokens de extensión con 401.
    """
    app.dependency_overrides[get_current_user_flexible] = lambda: AuthenticatedUser(
        user=user, source=source
    )


def override_entry_service(service: EntryService) -> None:
    app.dependency_overrides[get_entry_service] = lambda: service


def override_profile_service(service: ProfileService) -> None:
    app.dependency_overrides[get_profile_service] = lambda: service


def clear_overrides() -> None:
    app.dependency_overrides.clear()


async def persist_user(user: User) -> User:
    """Inserta un usuario en la base de datos de test.

    Necesario para tests de integración que crean entradas o progreso,
    ya que la tabla entries tiene una FK a users.id.
    """
    from sqlalchemy.pool import NullPool

    from app.core.config import settings

    engine = create_async_engine(
        settings.database_url,
        poolclass=NullPool,
        echo=False,
        future=True,
    )
    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    try:
        async with async_session_factory() as session:
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user
    finally:
        await engine.dispose()
