"""Tests unitarios de StatsService para calcular estadísticas agregadas.

Cobertura: get_user_stats con diferentes escenarios de entradas del usuario.
Tests con datos reales en BD de test.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.entry import Entry, EntryStatus, EntryType
from app.models.enums import ProgressEventType, ProgressUnit
from app.models.progress_event import ProgressEvent
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import EntryCreate
from app.services.stats_service import StatsService
from tests.factories import make_user, persist_user


@pytest.fixture
async def db_session():
    """Sesión de BD de test con NullPool."""
    engine = create_async_engine(settings.database_url, poolclass=NullPool, echo=False)
    async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_factory() as session:
        yield session
    await engine.dispose()


class TestStatsServiceEmpty:
    """Tests con usuario sin entradas."""

    async def test_empty_stats(self, db_session: AsyncSession):
        """Usuario sin entradas retorna estadísticas vacías."""
        user = make_user()
        await persist_user(user)
        service = StatsService(db_session)

        stats = await service.get_user_stats(user.id)

        assert stats["total_entries"] == 0
        assert stats["avg_rating"] == 0.0
        assert stats["completion_rate"] == 0.0
        assert stats["current_streak_days"] == 0
        assert len(stats["entries_by_month"]) == 0


class TestStatsServiceBasic:
    """Tests con estadísticas básicas."""

    async def test_total_and_by_type(self, db_session: AsyncSession):
        """Cuenta correctamente total de entradas y distribución por tipo."""
        user = make_user()
        await persist_user(user)
        repo = EntryRepository(db_session)

        # Crear 3 anime, 2 manga, 1 game
        await repo.create(
            user.id, EntryCreate(title="Anime 1", type=EntryType.anime, status=EntryStatus.watching)
        )
        await repo.create(
            user.id, EntryCreate(title="Anime 2", type=EntryType.anime, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="Anime 3", type=EntryType.anime, status=EntryStatus.dropped)
        )
        await repo.create(
            user.id, EntryCreate(title="Manga 1", type=EntryType.manga, status=EntryStatus.watching)
        )
        await repo.create(
            user.id, EntryCreate(title="Manga 2", type=EntryType.manga, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="Game 1", type=EntryType.game, status=EntryStatus.completed)
        )

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        assert stats["total_entries"] == 6
        assert stats["by_type"]["anime"] == 3
        assert stats["by_type"]["manga"] == 2
        assert stats["by_type"]["game"] == 1

    async def test_by_status(self, db_session: AsyncSession):
        """Cuenta correctamente distribución por estado."""
        user = make_user()
        await persist_user(user)
        repo = EntryRepository(db_session)

        await repo.create(
            user.id, EntryCreate(title="Entry 1", type=EntryType.anime, status=EntryStatus.watching)
        )
        await repo.create(
            user.id, EntryCreate(title="Entry 2", type=EntryType.anime, status=EntryStatus.watching)
        )
        await repo.create(
            user.id, EntryCreate(title="Entry 3", type=EntryType.anime, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="Entry 4", type=EntryType.manga, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="Entry 5", type=EntryType.manga, status=EntryStatus.on_hold)
        )
        await repo.create(
            user.id, EntryCreate(title="Entry 6", type=EntryType.game, status=EntryStatus.dropped)
        )

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        assert stats["by_status"]["watching"] == 2
        assert stats["by_status"]["completed"] == 2
        assert stats["by_status"]["on_hold"] == 1
        assert stats["by_status"]["dropped"] == 1
        assert stats["by_status"]["plan_to_watch"] == 0


class TestStatsServiceRatings:
    """Tests de métricas de ratings."""

    async def test_avg_rating_global(self, db_session: AsyncSession):
        """Calcula correctamente rating promedio global."""
        user = make_user()
        await persist_user(user)
        repo = EntryRepository(db_session)

        await repo.create(
            user.id,
            EntryCreate(
                title="Entry 1", type=EntryType.anime, status=EntryStatus.completed, rating=8.0
            ),
        )
        await repo.create(
            user.id,
            EntryCreate(
                title="Entry 2", type=EntryType.anime, status=EntryStatus.completed, rating=9.0
            ),
        )
        await repo.create(
            user.id,
            EntryCreate(
                title="Entry 3", type=EntryType.manga, status=EntryStatus.completed, rating=7.0
            ),
        )
        # Entrada sin rating no se cuenta
        await repo.create(
            user.id, EntryCreate(title="Entry 4", type=EntryType.game, status=EntryStatus.watching)
        )

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        assert stats["avg_rating"] == pytest.approx(8.0, abs=0.01)  # (8+9+7)/3

    async def test_avg_rating_by_type(self, db_session: AsyncSession):
        """Calcula correctamente rating promedio por tipo."""
        user = make_user()
        await persist_user(user)
        repo = EntryRepository(db_session)

        await repo.create(
            user.id,
            EntryCreate(
                title="Anime 1", type=EntryType.anime, status=EntryStatus.completed, rating=8.0
            ),
        )
        await repo.create(
            user.id,
            EntryCreate(
                title="Anime 2", type=EntryType.anime, status=EntryStatus.completed, rating=10.0
            ),
        )
        await repo.create(
            user.id,
            EntryCreate(
                title="Manga 1", type=EntryType.manga, status=EntryStatus.completed, rating=6.0
            ),
        )

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        assert stats["avg_rating_by_type"]["anime"] == pytest.approx(9.0, abs=0.01)
        assert stats["avg_rating_by_type"]["manga"] == pytest.approx(6.0, abs=0.01)
        assert stats["avg_rating_by_type"]["game"] == 0.0  # Sin entradas

    async def test_rating_distribution(self, db_session: AsyncSession):
        """Calcula correctamente distribución de ratings 1-10."""
        user = make_user()
        await persist_user(user)
        repo = EntryRepository(db_session)

        # Crear entradas con ratings variados
        await repo.create(
            user.id,
            EntryCreate(
                title="Entry 1", type=EntryType.anime, status=EntryStatus.completed, rating=7.3
            ),
        )
        await repo.create(
            user.id,
            EntryCreate(
                title="Entry 2", type=EntryType.anime, status=EntryStatus.completed, rating=8.8
            ),
        )
        await repo.create(
            user.id,
            EntryCreate(
                title="Entry 3", type=EntryType.manga, status=EntryStatus.completed, rating=9.1
            ),
        )
        await repo.create(
            user.id,
            EntryCreate(
                title="Entry 4", type=EntryType.game, status=EntryStatus.completed, rating=5.5
            ),
        )

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        dist = stats["rating_distribution"]
        # Ratings redondeados: 7, 9, 9, 6
        assert dist[7] == 1
        assert dist[9] == 2
        assert dist[6] == 1
        assert dist[10] == 0


class TestStatsServiceCompletion:
    """Tests de métricas de completado."""

    async def test_completion_rate(self, db_session: AsyncSession):
        """Calcula correctamente tasa de completado global."""
        user = make_user()
        await persist_user(user)
        repo = EntryRepository(db_session)

        # 3 completadas de 5 total = 60%
        await repo.create(
            user.id, EntryCreate(title="E1", type=EntryType.anime, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="E2", type=EntryType.anime, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="E3", type=EntryType.manga, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="E4", type=EntryType.anime, status=EntryStatus.watching)
        )
        await repo.create(
            user.id, EntryCreate(title="E5", type=EntryType.game, status=EntryStatus.on_hold)
        )

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        assert stats["completion_rate"] == pytest.approx(60.0, abs=0.1)

    async def test_completion_rate_by_type(self, db_session: AsyncSession):
        """Calcula correctamente tasa de completado por tipo."""
        user = make_user()
        await persist_user(user)
        repo = EntryRepository(db_session)

        # Anime: 2/3 = 66.67%
        await repo.create(
            user.id, EntryCreate(title="A1", type=EntryType.anime, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="A2", type=EntryType.anime, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="A3", type=EntryType.anime, status=EntryStatus.watching)
        )
        # Manga: 1/2 = 50%
        await repo.create(
            user.id, EntryCreate(title="M1", type=EntryType.manga, status=EntryStatus.completed)
        )
        await repo.create(
            user.id, EntryCreate(title="M2", type=EntryType.manga, status=EntryStatus.dropped)
        )
        # Game: 0/1 = 0%
        await repo.create(
            user.id, EntryCreate(title="G1", type=EntryType.game, status=EntryStatus.plan_to_watch)
        )

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        assert stats["completion_rate_by_type"]["anime"] == pytest.approx(66.67, abs=0.1)
        assert stats["completion_rate_by_type"]["manga"] == pytest.approx(50.0, abs=0.1)
        assert stats["completion_rate_by_type"]["game"] == pytest.approx(0.0, abs=0.1)


class TestStatsServiceProgress:
    """Tests de progreso acumulado."""

    async def test_total_progress_by_unit(self, db_session: AsyncSession):
        """Calcula correctamente progreso acumulado por unidad."""
        user = make_user()
        await persist_user(user)

        # Crear entradas manualmente con progreso
        entry1 = Entry(
            id=uuid4(),
            user_id=user.id,
            title="Anime 1",
            type=EntryType.anime,
            status=EntryStatus.watching,
            progress_unit=ProgressUnit.episodes,
            current_progress=Decimal("12"),
        )
        entry2 = Entry(
            id=uuid4(),
            user_id=user.id,
            title="Anime 2",
            type=EntryType.anime,
            status=EntryStatus.watching,
            progress_unit=ProgressUnit.episodes,
            current_progress=Decimal("24"),
        )
        entry3 = Entry(
            id=uuid4(),
            user_id=user.id,
            title="Manga 1",
            type=EntryType.manga,
            status=EntryStatus.watching,
            progress_unit=ProgressUnit.chapters,
            current_progress=Decimal("50"),
        )
        entry4 = Entry(
            id=uuid4(),
            user_id=user.id,
            title="Game 1",
            type=EntryType.game,
            status=EntryStatus.watching,
            progress_unit=ProgressUnit.hours,
            current_progress=Decimal("15.5"),
        )

        db_session.add_all([entry1, entry2, entry3, entry4])
        await db_session.commit()

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        progress = stats["total_progress"]
        assert progress["episodes"] == pytest.approx(36.0, abs=0.01)  # 12+24
        assert progress["chapters"] == pytest.approx(50.0, abs=0.01)
        assert progress["hours"] == pytest.approx(15.5, abs=0.01)


class TestStatsServiceTimeline:
    """Tests de timeline y rachas."""

    async def test_entries_by_month(self, db_session: AsyncSession):
        """Calcula correctamente entradas añadidas por mes."""
        user = make_user()
        await persist_user(user)

        # Crear entradas en diferentes meses
        now = datetime.now()
        entry1 = Entry(
            id=uuid4(),
            user_id=user.id,
            title="Entry 1",
            type=EntryType.anime,
            status=EntryStatus.watching,
            created_at=now - timedelta(days=30),
        )
        entry2 = Entry(
            id=uuid4(),
            user_id=user.id,
            title="Entry 2",
            type=EntryType.anime,
            status=EntryStatus.watching,
            created_at=now - timedelta(days=30),
        )
        entry3 = Entry(
            id=uuid4(),
            user_id=user.id,
            title="Entry 3",
            type=EntryType.manga,
            status=EntryStatus.watching,
            created_at=now - timedelta(days=60),
        )

        db_session.add_all([entry1, entry2, entry3])
        await db_session.commit()

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        # Verificar que hay entradas en el timeline
        assert len(stats["entries_by_month"]) > 0

    async def test_current_streak(self, db_session: AsyncSession):
        """Calcula correctamente racha de días consecutivos con actualizaciones."""
        user = make_user()
        await persist_user(user)

        # Crear entrada
        entry = Entry(
            id=uuid4(),
            user_id=user.id,
            title="Test Entry",
            type=EntryType.anime,
            status=EntryStatus.watching,
            progress_unit=ProgressUnit.episodes,
        )
        db_session.add(entry)
        await db_session.commit()

        # Crear eventos de progreso en días consecutivos
        today = datetime.now()
        for i in range(3):
            event = ProgressEvent(
                id=uuid4(),
                entry_id=entry.id,
                user_id=user.id,
                previous_value=Decimal(i),
                current_value=Decimal(i + 1),
                unit=ProgressUnit.episodes,
                recorded_at=today - timedelta(days=i),
                event_type=ProgressEventType.increment,
                source="web",
            )
            db_session.add(event)
        await db_session.commit()

        service = StatsService(db_session)
        stats = await service.get_user_stats(user.id)

        # Debe detectar racha de 3 días
        assert stats["current_streak_days"] == 3
