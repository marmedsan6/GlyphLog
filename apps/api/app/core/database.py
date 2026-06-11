from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,  # Logs SQL solo en debug — nunca en producción
    pool_pre_ping=True,  # Detecta conexiones caídas antes de usarlas
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Evita lazy-loading de atributos tras commit
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependencia de FastAPI: proporciona una sesión de BD por request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
