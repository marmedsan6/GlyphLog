import os

# Configurar variables de entorno ANTES de importar la app.
# pydantic-settings lee de os.environ al importar config.py.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_glyphlog")
os.environ.setdefault("SECRET_KEY", "test_secret_key_minimum_32_characters_long_for_unit_tests")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("ALLOWED_ORIGINS", '["http://localhost:5173"]')
# Límites bajos para testing — permiten verificar rate limiting sin cientos de peticiones.
os.environ.setdefault("RATE_LIMIT_LOGIN", "2/minute")
os.environ.setdefault("RATE_LIMIT_REGISTER", "2/minute")

import hashlib

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.security import AuthenticatedUser, create_access_token
from app.main import app
from app.models.user import User
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import EntryCreate
from app.services.device_token_service import DEVICE_TOKEN_PREFIX
from tests.factories import make_user, override_current_user, override_current_user_flexible, persist_user


@pytest.fixture
async def entry_factory():
    """Crea una entrada real en la base de datos de test.

    Útil para tests de integración que necesiten una entrada existente
    (GET, PUT, DELETE, progress) sin pasar por la API.

    Usa un engine con NullPool para evitar que asyncpg reutilice conexiones
    atadas a un event loop distinto entre tests.
    """
    from sqlalchemy.pool import NullPool

    from app.core.config import settings
    from app.models.entry import Entry, EntryStatus, EntryType

    async def _create(
        user_id=None,
        title="Test Entry",
        type=EntryType.anime,
        status=EntryStatus.watching,
        rating=None,
        year=None,
        progress_total=None,
        current_progress=None,
        cover_image=None,
    ):
        from uuid import uuid4

        from app.models.entry import FIXED_UNIT_BY_TYPE
        from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

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
                repo = EntryRepository(session)
                entry = await repo.create(
                    user_id=user_id or uuid4(),
                    data=EntryCreate(
                        title=title,
                        type=type,
                        status=status,
                        rating=rating,
                        year=year,
                        progress_unit=FIXED_UNIT_BY_TYPE.get(type),
                        progress_total=progress_total,
                        cover_image=cover_image,
                    ),
                )
                if current_progress is not None and current_progress > 0:
                    entry.current_progress = current_progress
                    await session.commit()
                    await session.refresh(entry)
                return entry
        finally:
            await engine.dispose()

    yield _create


@pytest.fixture(autouse=True)
def reset_rate_limiter() -> None:
    """Resetea el contador de rate limiting entre tests para evitar interferencias."""
    limiter.reset()


@pytest.fixture(autouse=True, scope="function")
async def clean_test_db() -> None:
    """Limpia las tablas de test antes de cada test para aislamiento."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    engine = create_async_engine(
        settings.database_url,
        poolclass=NullPool,
        echo=False,
        future=True,
    )
    async_session_factory = async_sessionmaker(engine, class_=AsyncSession)
    try:
        async with async_session_factory() as session:
            await session.execute(
                text(
                    "TRUNCATE TABLE device_tokens, progress_events, entries, users "
                    "RESTART IDENTITY CASCADE"
                )
            )
            await session.commit()
    finally:
        await engine.dispose()


@pytest.fixture
async def client() -> AsyncClient:
    """Cliente HTTP asíncrono para tests de integración con la app FastAPI."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
async def user_with_jwt() -> tuple[User, str]:
    """Crea un usuario en BD y retorna (user, jwt_token) para tests JWT."""
    user = make_user(email="jwt_test@example.com", username="jwt_user")
    await persist_user(user)
    jwt_token = create_access_token(subject=str(user.id))
    override_current_user(user, source="web")
    yield user, jwt_token
    from tests.factories import clear_overrides
    clear_overrides()


@pytest.fixture
async def user_with_device() -> tuple[User, str]:
    """Crea un usuario en BD y retorna (user, device_token) para tests de extensión."""
    user = make_user(email="device_test@example.com", username="device_user")
    await persist_user(user)

    # Crear un device token ficticio (formato dt_...)
    # En los tests reales, el servicio lo genera; aquí lo simulamos.
    raw_token = f"{DEVICE_TOKEN_PREFIX}test_token_abcdef1234567890"

    # Mockear solo el auth flexible; get_current_user (JWT-only) sigue real,
    # así los endpoints protegidos por JWT rechazan el device token con 401.
    override_current_user_flexible(user, source="browser_extension")

    yield user, raw_token

    from tests.factories import clear_overrides
    clear_overrides()
