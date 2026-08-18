"""Tests de las tools del agente de GlyphAI (scoping por user_id, errores)."""

from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

from app.ai.tools import build_agent_tools
from app.services.entry_service import EntryService


class TestAgentTools:
    def make_tools(self, entry_service: EntryService):
        return build_agent_tools(entry_service)

    def _config(self, user_id: str) -> dict:
        return {"configurable": {"user_id": user_id}}

    async def test_search_collection_scopes_by_user(self) -> None:
        service = AsyncMock(spec=EntryService)
        service.get_all.return_value.total = 0
        service.get_all.return_value.entries = []

        tools = self.make_tools(service)
        search = tools[0]

        user_id = str(uuid4())
        await search.ainvoke({"query": None}, config=self._config(user_id))

        service.get_all.assert_awaited_once()
        assert service.get_all.await_args.kwargs["user_id"] == UUID(user_id)

    async def test_create_entry_returns_confirmation(self) -> None:
        service = AsyncMock(spec=EntryService)
        service.create.return_value = SimpleNamespace(title="One Piece")

        tools = self.make_tools(service)
        create = tools[1]

        result = await create.ainvoke(
            {
                "title": "One Piece",
                "type": "anime",
                "status": "watching",
                "rating": None,
                "year": None,
                "notes": None,
                "genres": None,
            },
            config=self._config(str(uuid4())),
        )

        assert "creada correctamente" in result

    async def test_create_entry_maps_errors_to_message(self) -> None:
        service = AsyncMock(spec=EntryService)
        service.create.side_effect = Exception("Ya tienes esta entrada")

        tools = self.make_tools(service)
        create = tools[1]

        result = await create.ainvoke(
            {
                "title": "One Piece",
                "type": "anime",
                "status": "watching",
                "rating": None,
                "year": None,
                "notes": None,
                "genres": None,
            },
            config=self._config(str(uuid4())),
        )

        assert "No se pudo crear" in result
        assert "Ya tienes esta entrada" in result

    async def test_update_entry_requires_entry_id(self) -> None:
        service = AsyncMock(spec=EntryService)
        service.update.return_value = SimpleNamespace(title="One Piece")

        tools = self.make_tools(service)
        update = tools[2]

        entry_id = str(uuid4())
        result = await update.ainvoke(
            {
                "entry_id": entry_id,
                "status": "completed",
                "rating": None,
                "current_progress": None,
                "notes": None,
                "genres": None,
            },
            config=self._config(str(uuid4())),
        )

        assert "actualizada correctamente" in result
        assert service.update.await_args.kwargs["entry_id"] == UUID(entry_id)

