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

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.rate_limiter import limiter
from app.main import app


@pytest.fixture(autouse=True)
def reset_rate_limiter() -> None:
    """Resetea el contador de rate limiting entre tests para evitar interferencias."""
    limiter.reset()


@pytest.fixture
async def client() -> AsyncClient:
    """Cliente HTTP asíncrono para tests de integración con la app FastAPI."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
