"""Tests del AIRepository (integración con la BD de test)."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.repositories.ai_repository import AIRepository
from tests.factories import make_user, persist_user


class TestAIRepository:
    async def test_returns_only_user_entries(self, entry_factory) -> None:
        user = await persist_user(make_user(email="ai_repo@example.com", username="ai_repo"))
        other = await persist_user(
            make_user(email="ai_repo_other@example.com", username="ai_repo_other")
        )
        await entry_factory(user_id=user.id, title="Mi Anime")
        await entry_factory(user_id=other.id, title="De Otro Usuario")

        engine = create_async_engine(settings.database_url, poolclass=NullPool)
        try:
            async with async_sessionmaker(engine, class_=AsyncSession)() as session:
                repository = AIRepository(session)
                entries = await repository.get_user_collection_summary(user.id)
        finally:
            await engine.dispose()

        assert [entry.title for entry in entries] == ["Mi Anime"]

    async def test_returns_empty_list_for_user_without_entries(self) -> None:
        user = await persist_user(make_user(email="ai_repo_empty@example.com", username="ai_repo_empty"))

        engine = create_async_engine(settings.database_url, poolclass=NullPool)
        try:
            async with async_sessionmaker(engine, class_=AsyncSession)() as session:
                repository = AIRepository(session)
                entries = await repository.get_user_collection_summary(user.id)
        finally:
            await engine.dispose()

        assert entries == []
