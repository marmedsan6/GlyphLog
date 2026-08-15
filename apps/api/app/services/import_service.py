"""Servicio de importación inteligente con un LLM (Claude vía Bedrock o OpenAI)."""

import logging
import re
from decimal import Decimal
from uuid import UUID

from app.integrations.llm import JsonLlm
from app.models.entry import FIXED_UNIT_BY_TYPE
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import EntryCreate, EntryUpdate
from app.schemas.import_schema import (
    ImportError,
    ImportExecuteResponse,
    ImportParseResponse,
    ImportSource,
    ParsedEntry,
)
from app.services.catalog_enrichment_service import CatalogEnrichmentService

logger = logging.getLogger(__name__)

# Máximo de caracteres del contenido que se envían al LLM. Listas mayores
# se truncan y se avisa al usuario para que no crea que se analizó todo.
# 120k chars ≈ 30k tokens: suficiente para un export MAL de ~250k chars
# manteniendo margen para la respuesta.
MAX_PARSE_CONTENT_CHARS = 120_000

# Número máximo de entradas por chunk enviado al LLM.
#
# El límite real es el `max_tokens` de SALIDA del modelo (4096 en Claude Haiku).
# Cada entrada parseada ocupa ~80-120 tokens de JSON de salida, por lo que con
# ~30 entradas por chunk queda margen de sobra y evitamos que el modelo trunque
# el JSON a mitad de un string (bug: importación de listas grandes devolvía 422).
MAX_CHUNK_ENTRIES = 30

# Bloque `<anime>...</anime>` de un export MyAnimeList.
_MAL_ANIME_BLOCK_RE = re.compile(r"<anime>.*?</anime>", re.DOTALL)


class ImportService:
    """Servicio para parsear e importar listas de contenido con un LLM."""

    def __init__(
        self,
        llm_client: JsonLlm,
        entry_repository: EntryRepository,
        enrichment: CatalogEnrichmentService | None = None,
    ):
        self.llm_client = llm_client
        self.entry_repository = entry_repository
        self.enrichment = enrichment

    async def parse_import(
        self, source: ImportSource, content: str, user_id: str
    ) -> ImportParseResponse:
        """
        Parsea contenido de una lista externa usando Claude.

        Args:
            source: Fuente de la lista (MAL, AniList, etc.)
            content: Contenido a parsear
            user_id: ID del usuario para detectar duplicados

        Returns:
            ImportParseResponse con entradas parseadas y advertencias

        La lista se divide en chunks acotados (ver `_split_content`) y se parsea
        cada chunk por separado para no superar el límite de tokens de SALIDA del
        LLM. Los resultados y warnings se concatenan en orden.
        """
        logger.info(f"Parseando importación de {source.value} para user {user_id}")

        warnings: list[str] = []

        # Dividir la lista en chunks para no exceder el max_tokens de salida.
        chunks = self._split_content(source, content)
        format_description = self._get_format_description(source)

        parsed_entries: list[ParsedEntry] = []
        for idx, chunk in enumerate(chunks):
            try:
                chunk_entries = self._parse_chunk(source, format_description, chunk)
                parsed_entries.extend(chunk_entries)
            except Exception as e:
                # Un chunk que falle no debe tumbar el resto de la lista.
                logger.error(f"Error al parsear chunk {idx + 1}/{len(chunks)}: {e}")
                warnings.append(
                    f"Error al analizar el bloque {idx + 1} de {len(chunks)}: "
                    f"no se pudieron extraer sus entradas."
                )

        if len(chunks) > 1:
            logger.info(f"Importación parseada en {len(chunks)} chunks")

        # Detectar duplicados contra la colección del usuario (sobre el total).
        await self._mark_duplicates(parsed_entries, user_id, warnings)

        logger.info(
            f"Parseo exitoso: {len(parsed_entries)} entradas, {len(warnings)} advertencias"
        )
        return ImportParseResponse(entries=parsed_entries, warnings=warnings)

    def _parse_chunk(
        self, source: ImportSource, format_description: str, chunk_content: str
    ) -> list[ParsedEntry]:
        """Parsea un único chunk con el LLM y devuelve sus entradas validadas."""
        prompt = self._build_parse_prompt(source, format_description, chunk_content)

        # Invocar el LLM configurado (Bedrock en prod, OpenAI en dev)
        parsed_data = self.llm_client.invoke_json(
            prompt=prompt,
            temperature=0.3,  # Baja temperatura para mayor precisión
            system=(
                "You are a parser for anime/manga/game lists. "
                "Extract structured data accurately."
            ),
        )

        if not isinstance(parsed_data, list):
            raise ValueError("Claude no devolvió un array JSON")

        entries: list[ParsedEntry] = []
        for item in parsed_data:
            try:
                entries.append(ParsedEntry(**item))
            except Exception as e:
                title = item.get("title", "Desconocido") if isinstance(item, dict) else "Desconocido"
                logger.warning(f"Error validando entrada '{title}': {e}")

        return entries

    def _split_content(self, source: ImportSource, content: str) -> list[str]:
        """Divide el contenido en chunks que no excedan `MAX_CHUNK_ENTRIES`.

        Para export MAL/AniList/Kitsu (XML/JSON estructurado) se divide por
        bloques de entrada. Para texto libre o formatos no reconocidos, se
        divide por líneas. Si el contenido es pequeño, se devuelve en un solo
        chunk.
        """
        chunks = self._split_by_blocks(source, content)
        if chunks:
            return chunks

        # Fallback: dividir por líneas, agrupando de a MAX_CHUNK_ENTRIES.
        lines = [line for line in content.splitlines() if line.strip()]
        if len(lines) <= MAX_CHUNK_ENTRIES:
            return [content]

        grouped: list[str] = []
        for i in range(0, len(lines), MAX_CHUNK_ENTRIES):
            grouped.append("\n".join(lines[i : i + MAX_CHUNK_ENTRIES]))
        return grouped

    def _split_by_blocks(self, source: ImportSource, content: str) -> list[str]:
        """Divide contenido estructurado por bloques de entrada, si es posible.

        Solo los exports MAL usan bloques `<anime>...</anime>`. Para el resto de
        fuentes (AniList/Kitsu/Steam son JSON/texto) se devuelve lista vacía y
        `_split_content` cae al fallback por líneas.
        """
        if source == ImportSource.MAL:
            blocks = _MAL_ANIME_BLOCK_RE.findall(content)
            if blocks:
                # Mantener el encabezado XML (declaración + <myanimelist><myinfo>)
                # para que el LLM siga reconociendo el formato MAL.
                header = self._mal_header(content)
                chunked: list[str] = []
                for i in range(0, len(blocks), MAX_CHUNK_ENTRIES):
                    chunked.append(header + "\n".join(blocks[i : i + MAX_CHUNK_ENTRIES]) + "\n")
                return chunked

        return []

    @staticmethod
    def _mal_header(content: str) -> str:
        """Extrae el encabezado de un export MAL (hasta el primer `<anime>`)."""
        idx = content.find("<anime>")
        if idx == -1:
            return ""
        return content[:idx]

    async def execute_import(
        self, entries: list[ParsedEntry], user_id: str
    ) -> ImportExecuteResponse:
        """
        Ejecuta la importación de entradas parseadas.

        Args:
            entries: Lista de entradas a importar
            user_id: ID del usuario propietario

        Returns:
            ImportExecuteResponse con estadísticas de importación
        """
        logger.info(f"Ejecutando importación de {len(entries)} entradas para user {user_id}")

        created = 0
        skipped = 0
        errors: list[ImportError] = []

        for entry in entries:
            try:
                # Verificar si ya existe
                existing = await self.entry_repository.find_by_title_and_user(
                    title=entry.title.strip(), user_id=user_id
                )

                if existing:
                    skipped += 1
                    logger.debug(f"Entrada '{entry.title}' ya existe, omitiendo")
                    continue

                # Crear schema de entrada con la unidad fija derivada del tipo
                entry_data = EntryCreate(
                    title=entry.title.strip(),
                    type=entry.type,
                    status=entry.status,
                    rating=entry.rating,
                    year=entry.year,
                    notes=entry.notes,
                    progress_unit=FIXED_UNIT_BY_TYPE[entry.type],
                    progress_total=entry.progress_total,
                    current_progress=entry.current_progress or Decimal("0"),
                    cover_image=None,  # No se importa cover_image
                )

                # Crear entrada usando el repository
                created_entry = await self.entry_repository.create(
                    user_id=UUID(user_id), data=entry_data
                )
                created += 1
                logger.debug(f"Entrada '{entry.title}' creada exitosamente")

                # Auto-populado best-effort de géneros y portada desde el catálogo.
                if self.enrichment is not None:
                    try:
                        enrichment = await self.enrichment.find_enrichment(
                            entry_data.title, entry_data.type
                        )
                        update_fields: dict[str, object] = {}
                        if enrichment.genres:
                            update_fields["genres"] = enrichment.genres
                        if enrichment.cover_image:
                            update_fields["cover_image"] = enrichment.cover_image
                        if update_fields:
                            await self.entry_repository.update(
                                created_entry.id,
                                user_id=UUID(user_id),
                                data=EntryUpdate(**update_fields),
                            )
                    except Exception as e:
                        logger.debug(
                            f"No se pudieron auto-poblar géneros/portada para "
                            f"'{entry_data.title}': {e}"
                        )

            except Exception as e:
                errors.append(
                    ImportError(title=entry.title, error=f"Error al crear: {str(e)}")
                )
                logger.error(f"Error al crear entrada '{entry.title}': {e}")

        logger.info(
            f"Importación completada: {created} creadas, {skipped} omitidas, {len(errors)} errores"
        )
        return ImportExecuteResponse(created=created, skipped=skipped, errors=errors)

    def _get_format_description(self, source: ImportSource) -> str:
        """Retorna descripción del formato según la fuente."""
        descriptions = {
            ImportSource.MAL: "MyAnimeList XML export or HTML table copied from the web interface",
            ImportSource.ANILIST: "AniList JSON export from settings",
            ImportSource.KITSU: "Kitsu JSON export",
            ImportSource.STEAM: "Steam library list copied from the Steam client",
            ImportSource.TEXT: "Free-form text (e.g., 'Death Note - Completed - 9/10')",
        }
        return descriptions.get(source, "Unknown format")

    def _build_parse_prompt(
        self, source: ImportSource, format_description: str, content: str
    ) -> str:
        """Construye el prompt para Claude."""
        return f"""You are a parser for anime/manga/game lists. Parse this {source.value} list and extract entries.

Input format: {format_description}

For each entry, extract:
- title (string, canonical English name if possible)
- type (anime | manga | game)
- status (watching | completed | on_hold | dropped | plan_to_watch)
- rating (integer 1-10, null if not present)
- current_progress (decimal, null if not present)
- progress_total (decimal, null if not present)
- year (integer, null if not present)
- notes (string, null if not present)
- confidence (float 0.0-1.0, how confident you are in this parse)

Return ONLY a JSON array of entries, no additional text.

List content:
{content[:MAX_PARSE_CONTENT_CHARS]}"""  # Limitar para no exceder límites de contexto

    async def _mark_duplicates(
        self, entries: list[ParsedEntry], user_id: str, warnings: list[str]
    ) -> None:
        """Marca entradas duplicadas contra la colección del usuario."""
        # Obtener títulos de la colección del usuario
        existing_entries = await self.entry_repository.list_by_user(user_id)
        existing_titles = {e.title.lower().strip() for e in existing_entries}

        duplicates_found = 0
        for entry in entries:
            normalized_title = entry.title.lower().strip()
            if normalized_title in existing_titles:
                duplicates_found += 1

        if duplicates_found > 0:
            warnings.append(
                f"{duplicates_found} entradas ya existen en tu colección y serán omitidas"
            )
