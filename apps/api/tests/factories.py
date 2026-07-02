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

from app.core.dependencies import get_entry_service
from app.core.security import get_current_user, hash_password
from app.main import app
from app.models.entry import Entry, EntryStatus, EntryType
from app.models.user import User
from app.repositories.entry_repository import EntryRepository
from app.services.entry_service import EntryService


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
        created_at=created_at or now,
        updated_at=updated_at or now,
    )


def make_user(
    email: str = "test@example.com",
    hashed_password: str | None = None,
    provider: str = "local",
    provider_id: str | None = None,
) -> User:
    """Crea una instancia de User en memoria para simular autenticación."""
    return User(
        id=uuid4(),
        email=email,
        hashed_password=hashed_password or hash_password("validpass1"),
        provider=provider,
        provider_id=provider_id,
    )


@pytest.fixture
def mock_entry_repo() -> AsyncMock:
    return AsyncMock(spec=EntryRepository)


@pytest.fixture
def entry_service(mock_entry_repo: AsyncMock) -> EntryService:
    return EntryService(entry_repo=mock_entry_repo)


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


def override_current_user(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: user


def override_entry_service(service: EntryService) -> None:
    app.dependency_overrides[get_entry_service] = lambda: service


def clear_overrides() -> None:
    app.dependency_overrides.clear()
