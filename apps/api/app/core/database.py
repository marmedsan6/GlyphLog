import logging
import time
from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

logger = logging.getLogger(__name__)

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


# Logging de queries lentas (>100ms) para auditoría de performance
@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault("query_start_time", []).append(time.time())


@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total_time = time.time() - conn.info["query_start_time"].pop()
    if total_time > 0.1:  # >100ms
        logger.warning(f"Slow query ({total_time:.3f}s): {statement[:200]}")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependencia de FastAPI: proporciona una sesión de BD por request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
