"""Tests del AgentService (streaming con LangGraph mockeado)."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from langchain_core.messages import AIMessageChunk, ToolMessage

from app.repositories.ai_repository import AIRepository
from app.services.agent_service import AgentService


async def async_gen(items):
    for item in items:
        yield item


class TestAgentService:
    def make_service(self):
        llm = MagicMock()
        repo = AsyncMock(spec=AIRepository)
        repo.get_user_collection_summary.return_value = []
        return AgentService(llm=llm, tools=[], ai_repository=repo)

    async def test_build_system_prompt_empty_collection(self) -> None:
        service = self.make_service()
        prompt = await service.build_system_prompt(uuid4())
        assert "GlyphAI" in prompt
        assert "aún no tiene entradas" in prompt

    async def test_astream_emits_deltas_and_done(self) -> None:
        service = self.make_service()

        # Mock del agente compilado que devuelve tuplas (message, metadata).
        fake_agent = MagicMock()
        fake_agent.astream.return_value = async_gen(
            [
                (AIMessageChunk(content="Hola"), {}),
                (AIMessageChunk(content=" mundo"), {}),
            ]
        )

        with patch.object(service, "_build_agent", return_value=fake_agent):
            events = [
                event
                async for event in service.astream(
                    messages=[{"role": "user", "content": "hola"}],
                    user_id=uuid4(),
                    system_prompt="Sistema",
                )
            ]

        types = [e.type for e in events]
        assert types == ["delta", "delta", "done"]
        assert "".join(e.content for e in events if e.type == "delta") == "Hola mundo"

    async def test_astream_extracts_text_from_block_lists(self) -> None:
        """Bedrock emite `content` como lista de bloques; debe aplanarse a texto."""
        service = self.make_service()

        fake_agent = MagicMock()
        fake_agent.astream.return_value = async_gen(
            [
                (AIMessageChunk(content=[{"type": "text", "text": "Hola", "index": 0}]), {}),
                (AIMessageChunk(content=[{"type": "text", "text": " mundo", "index": 0}]), {}),
            ]
        )

        with patch.object(service, "_build_agent", return_value=fake_agent):
            events = [
                event
                async for event in service.astream(
                    messages=[{"role": "user", "content": "hola"}],
                    user_id=uuid4(),
                    system_prompt="Sistema",
                )
            ]

        assert "".join(e.content for e in events if e.type == "delta") == "Hola mundo"

    async def test_astream_emits_tool_events(self) -> None:
        service = self.make_service()

        fake_agent = MagicMock()
        fake_agent.astream.return_value = async_gen(
            [
                (ToolMessage(content="Entrada creada", tool_call_id="1"), {}),
                (AIMessageChunk(content="Hecho"), {}),
            ]
        )

        with patch.object(service, "_build_agent", return_value=fake_agent):
            events = [
                event
                async for event in service.astream(
                    messages=[{"role": "user", "content": "añade X"}],
                    user_id=uuid4(),
                    system_prompt="Sistema",
                )
            ]

        types = [e.type for e in events]
        assert "tool" in types
        assert types[-1] == "done"
