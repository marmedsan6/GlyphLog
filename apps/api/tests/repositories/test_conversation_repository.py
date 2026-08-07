"""Tests del ConversationRepository (integración con la BD de test)."""

import asyncio

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.conversation import ChatMessage
from app.repositories.conversation_repository import ConversationRepository
from tests.factories import make_user, persist_user


async def with_session(fn):
    """Ejecuta fn(session) con una sesión propia y devuelve su resultado."""
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    try:
        async with async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )() as session:
            return await fn(session)
    finally:
        await engine.dispose()


class TestConversationRepository:
    async def test_create_and_get_with_messages(self) -> None:
        user = await persist_user(make_user(email="conv_repo@example.com", username="conv_repo"))

        async def run(session: AsyncSession) -> None:
            repo = ConversationRepository(session)
            conversation = await repo.create(user.id, "Mi primer chat")
            await repo.add_message(conversation.id, "user", "hola")
            await repo.add_message(conversation.id, "assistant", "hola de vuelta")
            return conversation.id

        conversation_id = await with_session(run)

        async def verify(session: AsyncSession) -> tuple[str, list[str]]:
            conversation = await ConversationRepository(session).get_by_id(conversation_id, user.id)
            assert conversation is not None
            assert conversation.title == "Mi primer chat"
            return conversation.title, [m.content for m in conversation.messages]

        title, contents = await with_session(verify)
        assert title == "Mi primer chat"
        assert contents == ["hola", "hola de vuelta"]

    async def test_add_message_updates_conversation_updated_at(self) -> None:
        user = await persist_user(make_user(email="conv_ts@example.com", username="conv_ts"))

        async def run(session: AsyncSession) -> tuple[str, str]:
            repo = ConversationRepository(session)
            conversation = await repo.create(user.id, "Título")
            first_updated = conversation.updated_at.isoformat()
            await asyncio.sleep(0.05)  # garantiza timestamp distinto
            await repo.add_message(conversation.id, "user", "mensaje")
            # La instancia en memoria no se refresca tras el UPDATE; se relee
            # de BD para verificar el efecto real.
            refreshed = await repo.get_by_id(conversation.id, user.id)
            assert refreshed is not None
            return first_updated, refreshed.updated_at.isoformat()

        first_updated, after_message = await with_session(run)
        assert after_message > first_updated

    async def test_list_excludes_orphan_conversations_and_orders_by_updated_at(self) -> None:
        user = await persist_user(make_user(email="conv_list@example.com", username="conv_list"))

        async def run(session: AsyncSession) -> None:
            repo = ConversationRepository(session)
            older = await repo.create(user.id, "Más antigua")
            newer = await repo.create(user.id, "Más reciente")
            orphan = await repo.create(user.id, "Huérfana")
            await repo.add_message(older.id, "user", "primera")
            await asyncio.sleep(0.05)
            await repo.add_message(newer.id, "user", "segunda")
            # La huérfana no recibe mensajes → debe quedar excluida.
            assert orphan.id

        await with_session(run)

        async def verify(session: AsyncSession) -> tuple[list[str], int]:
            conversations, total = await ConversationRepository(session).list_by_user(
                user.id, 1, 15
            )
            return [c.title for c in conversations], total

        titles, total = await with_session(verify)
        assert titles == ["Más reciente", "Más antigua"]
        assert total == 2

    async def test_list_paginates(self) -> None:
        user = await persist_user(make_user(email="conv_page@example.com", username="conv_page"))

        async def run(session: AsyncSession) -> None:
            repo = ConversationRepository(session)
            for i in range(3):
                conversation = await repo.create(user.id, f"Conversación {i}")
                await repo.add_message(conversation.id, "user", f"msg {i}")

        await with_session(run)

        async def verify(session: AsyncSession) -> tuple[list[str], int]:
            repo = ConversationRepository(session)
            page1, total = await repo.list_by_user(user.id, 1, 2)
            page2, _ = await repo.list_by_user(user.id, 2, 2)
            return [c.title for c in page1], len(page2)

        page1_titles, page2_count = await with_session(verify)
        assert len(page1_titles) == 2
        assert page2_count == 1

    async def test_delete_only_own_conversation_with_cascade(self) -> None:
        user = await persist_user(make_user(email="conv_del@example.com", username="conv_del"))
        other = await persist_user(make_user(email="conv_del2@example.com", username="conv_del2"))

        async def run(session: AsyncSession) -> tuple[str, bool, bool]:
            repo = ConversationRepository(session)
            mine = await repo.create(user.id, "Mía")
            theirs = await repo.create(other.id, "De otro")
            await repo.add_message(mine.id, "user", "mensaje")
            await repo.add_message(theirs.id, "user", "mensaje")

            # No se puede borrar la conversación ajena.
            deleted_theirs = await repo.delete(theirs.id, user.id)
            # Sí se borra la propia.
            deleted_mine = await repo.delete(mine.id, user.id)
            return mine.id, deleted_theirs, deleted_mine

        mine_id, deleted_theirs, deleted_mine = await with_session(run)
        assert deleted_theirs is False
        assert deleted_mine is True

        # La cascada elimina los mensajes de la conversación borrada.
        async def count_messages(session: AsyncSession) -> int:
            result = await session.execute(
                select(func.count())
                .select_from(ChatMessage)
                .where(ChatMessage.conversation_id == mine_id)
            )
            return result.scalar_one()

        assert await with_session(count_messages) == 0
