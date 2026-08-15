"""Tests del chunking en ImportService.parse_import (issue #58).

Verifican que listas grandes se dividen en chunks para no exceder el
`max_tokens` de salida del LLM, y que los resultados/warnings se concatenan.
Sin dependencia de BD real: se mockean el LLM y el repositorio.
"""

from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from app.models.entry import Entry, EntryStatus, EntryType
from app.repositories.entry_repository import EntryRepository
from app.schemas.import_schema import ImportSource, ParsedEntry
from app.services.catalog_enrichment_service import (
    CatalogEnrichment,
    CatalogEnrichmentService,
)
from app.services.import_service import MAX_CHUNK_ENTRIES, ImportService


def make_parsed(title: str, idx: int = 0) -> ParsedEntry:
    return ParsedEntry(
        title=title,
        type=EntryType.anime,
        status=EntryStatus.completed,
        rating=None,
        current_progress=None,
        progress_total=None,
        year=None,
        notes=None,
        confidence=0.9,
    )


def make_service(llm=None, repo=None):
    llm = llm or AsyncMock()
    repo = repo or AsyncMock(spec=EntryRepository)
    repo.list_by_user.return_value = []
    return ImportService(llm, repo, enrichment=None)


class TestSplitByBlocks:
    def test_small_mal_is_single_chunk(self) -> None:
        content = (
            '<?xml version="1.0"?><myanimelist><myinfo>'
            '<user_total_anime>2</user_total_anime></myinfo>'
            "<anime><series_title>One Piece</series_title></anime>"
            "<anime><series_title>Naruto</series_title></anime>"
            "</myanimelist>"
        )
        chunks = make_service()._split_content(ImportSource.MAL, content)

        assert len(chunks) == 1
        assert "One Piece" in chunks[0]
        assert "Naruto" in chunks[0]

    def test_large_mal_is_chunked_by_blocks(self) -> None:
        blocks = [
            f"<anime><series_title>Anime {i}</series_title></anime>"
            for i in range(MAX_CHUNK_ENTRIES + 5)
        ]
        content = (
            '<?xml version="1.0"?><myanimelist><myinfo>'
            "<user_total_anime>999</user_total_anime></myinfo>"
            + "".join(blocks)
            + "</myanimelist>"
        )

        chunks = make_service()._split_content(ImportSource.MAL, content)

        # 35 entradas con chunk de 30 → 2 chunks (30 + 5)
        assert len(chunks) == 2
        assert chunks[0].count("<anime>") == MAX_CHUNK_ENTRIES
        assert chunks[1].count("<anime>") == 5
        # Ambos conservan el encabezado para que el LLM reconozca el formato
        assert chunks[0].startswith("<?xml")
        assert chunks[1].startswith("<?xml")

    def test_text_falls_back_to_line_chunking(self) -> None:
        lines = [f"Title {i} - Completed" for i in range(MAX_CHUNK_ENTRIES * 2 + 3)]
        content = "\n".join(lines)

        chunks = make_service()._split_content(ImportSource.TEXT, content)

        assert len(chunks) == 3

    def test_mal_header_extracted(self) -> None:
        content = (
            '<?xml version="1.0"?><myanimelist><myinfo>'
            "<user_id>1</user_id></myinfo><anime><series_title>X</series_title></anime>"
        )
        header = make_service()._mal_header(content)

        assert header == '<?xml version="1.0"?><myanimelist><myinfo><user_id>1</user_id></myinfo>'


class TestParseImportChunking:
    async def test_parses_each_chunk_and_concatenates_in_order(self) -> None:
        llm = Mock()
        llm.invoke_json.side_effect = [
            [make_parsed("Anime A").model_dump(), make_parsed("Anime B").model_dump()],
            [make_parsed("Anime C").model_dump()],
        ]

        blocks = [f"<anime><series_title>Anime {i}</series_title></anime>" for i in range(40)]
        content = (
            '<?xml version="1.0"?><myanimelist><myinfo>'
            "<user_total_anime>40</user_total_anime></myinfo>"
            + "".join(blocks)
            + "</myanimelist>"
        )

        service = make_service(llm=llm)
        response = await service.parse_import(ImportSource.MAL, content, "user-1")

        assert [e.title for e in response.entries] == ["Anime A", "Anime B", "Anime C"]
        assert llm.invoke_json.call_count == 2
        assert response.warnings == []

    async def test_failing_chunk_does_not_abort_others(self) -> None:
        llm = Mock()
        llm.invoke_json.side_effect = [
            ValueError("JSON truncado"),
            [make_parsed("Anime OK").model_dump()],
        ]

        # 2 chunks: 30 entradas + 1 extra
        blocks = [f"<anime><series_title>Anime {i}</series_title></anime>" for i in range(31)]
        content = (
            '<?xml version="1.0"?><myanimelist><myinfo>'
            "<user_total_anime>31</user_total_anime></myinfo>"
            + "".join(blocks)
            + "</myanimelist>"
        )

        service = make_service(llm=llm)
        response = await service.parse_import(ImportSource.MAL, content, "user-1")

        assert [e.title for e in response.entries] == ["Anime OK"]
        assert len(response.warnings) == 1
        assert "bloque 1" in response.warnings[0]


class TestExecuteImportEnrichment:
    async def test_execute_import_persists_cover_image(self) -> None:
        """execute_import guarda cover_image y genres del enriquecimiento."""
        repo = AsyncMock(spec=EntryRepository)
        repo.find_by_title_and_user.return_value = None
        created = Entry(
            id=uuid4(),
            user_id=uuid4(),
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.completed,
        )
        repo.create.return_value = created

        enrichment = AsyncMock(spec=CatalogEnrichmentService)
        enrichment.find_enrichment.return_value = CatalogEnrichment(
            genres=["Action"],
            cover_image="https://anilist.co/cover/one-piece.jpg",
        )

        service = ImportService(llm_client=Mock(), entry_repository=repo, enrichment=enrichment)

        response = await service.execute_import([make_parsed("One Piece")], str(uuid4()))

        assert response.created == 1
        # El update debe incluir genres y cover_image.
        update_call = repo.update.await_args
        assert update_call is not None
        update_data = update_call.kwargs["data"]
        assert update_data.genres == ["Action"]
        assert update_data.cover_image == "https://anilist.co/cover/one-piece.jpg"

    async def test_execute_import_no_enrichment_when_empty(self) -> None:
        """Si el enriquecimiento no devuelve nada, no se llama a update."""
        repo = AsyncMock(spec=EntryRepository)
        repo.find_by_title_and_user.return_value = None
        created = Entry(
            id=uuid4(),
            user_id=uuid4(),
            title="One Piece",
            type=EntryType.anime,
            status=EntryStatus.completed,
        )
        repo.create.return_value = created

        enrichment = AsyncMock(spec=CatalogEnrichmentService)
        enrichment.find_enrichment.return_value = CatalogEnrichment()

        service = ImportService(llm_client=Mock(), entry_repository=repo, enrichment=enrichment)

        await service.execute_import([make_parsed("One Piece")], str(uuid4()))

        repo.update.assert_not_called()
