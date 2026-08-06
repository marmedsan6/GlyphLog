"""Tests de integración del endpoint GET /api/v1/stats/overview."""

import pytest
from httpx import AsyncClient

from app.models.entry import EntryStatus, EntryType
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import EntryCreate
from tests.factories import make_user, persist_user


class TestStatsOverview:
    """Tests del endpoint GET /stats/overview."""

    async def test_stats_overview_requires_auth(self, client: AsyncClient):
        """Endpoint requiere autenticación."""
        response = await client.get("/api/v1/stats/overview")
        assert response.status_code == 401

    async def test_stats_overview_empty(self, client: AsyncClient, user_with_jwt):
        """Usuario sin entradas retorna estadísticas vacías."""
        user, jwt = user_with_jwt
        response = await client.get(
            "/api/v1/stats/overview", headers={"Authorization": f"Bearer {jwt}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_entries"] == 0
        assert data["avg_rating"] == 0.0
        assert data["completion_rate"] == 0.0

    async def test_stats_overview_with_data(self, client: AsyncClient, user_with_jwt, db_session):
        """Usuario con entradas retorna estadísticas correctas."""
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
        from sqlalchemy.pool import NullPool

        from app.core.config import settings

        user, jwt = user_with_jwt

        # Crear entradas
        engine = create_async_engine(settings.database_url, poolclass=NullPool, echo=False)
        async_session_factory = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        async with async_session_factory() as session:
            repo = EntryRepository(session)
            await repo.create(
                user.id,
                EntryCreate(
                    title="Anime 1", type=EntryType.anime, status=EntryStatus.completed, rating=8.0
                ),
            )
            await repo.create(
                user.id,
                EntryCreate(
                    title="Anime 2", type=EntryType.anime, status=EntryStatus.watching, rating=9.0
                ),
            )
            await repo.create(
                user.id,
                EntryCreate(
                    title="Manga 1", type=EntryType.manga, status=EntryStatus.completed, rating=7.0
                ),
            )
        await engine.dispose()

        response = await client.get(
            "/api/v1/stats/overview", headers={"Authorization": f"Bearer {jwt}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_entries"] == 3
        assert data["by_type"]["anime"] == 2
        assert data["by_type"]["manga"] == 1
        assert data["by_status"]["completed"] == 2
        assert data["by_status"]["watching"] == 1
        assert data["avg_rating"] == pytest.approx(8.0, abs=0.1)
        assert data["completion_rate"] == pytest.approx(66.67, abs=1.0)

    async def test_stats_overview_schema_validation(self, client: AsyncClient, user_with_jwt):
        """Respuesta cumple con el schema UserStats."""
        user, jwt = user_with_jwt
        response = await client.get(
            "/api/v1/stats/overview", headers={"Authorization": f"Bearer {jwt}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Verificar campos requeridos
        required_fields = [
            "total_entries",
            "by_type",
            "by_status",
            "avg_rating",
            "avg_rating_by_type",
            "completion_rate",
            "completion_rate_by_type",
            "top_genres",
            "rating_distribution",
            "total_progress",
            "entries_by_month",
            "current_streak_days",
        ]
        for field in required_fields:
            assert field in data, f"Campo {field} faltante en respuesta"

        # Verificar tipos
        assert isinstance(data["total_entries"], int)
        assert isinstance(data["by_type"], dict)
        assert isinstance(data["avg_rating"], (int, float))
        assert isinstance(data["completion_rate"], (int, float))
        assert isinstance(data["top_genres"], list)
        assert isinstance(data["rating_distribution"], dict)
        assert isinstance(data["entries_by_month"], list)
        assert isinstance(data["current_streak_days"], int)


@pytest.fixture
async def db_session():
    """Fixture de sesión de BD para tests."""
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    from app.core.config import settings

    engine = create_async_engine(settings.database_url, poolclass=NullPool, echo=False)
    async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_factory() as session:
        yield session
    await engine.dispose()
