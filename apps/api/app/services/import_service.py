"""Servicio de importación inteligente con un LLM (Claude vía Bedrock o OpenAI)."""

import logging
from decimal import Decimal
from uuid import UUID

from app.integrations.llm import JsonLlm
from app.models.entry import FIXED_UNIT_BY_TYPE
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import EntryCreate
from app.schemas.import_schema import (
    ImportError,
    ImportExecuteResponse,
    ImportParseResponse,
    ImportSource,
    ParsedEntry,
)

logger = logging.getLogger(__name__)

# Máximo de caracteres del contenido que se envían al LLM. Listas mayores
# se truncan y se avisa al usuario para que no crea que se analizó todo.
# 120k chars ≈ 30k tokens: suficiente para un export MAL de ~250k chars
# manteniendo margen para la respuesta.
MAX_PARSE_CONTENT_CHARS = 120_000


class ImportService:
    """Servicio para parsear e importar listas de contenido con un LLM."""

    def __init__(self, llm_client: JsonLlm, entry_repository: EntryRepository):
        self.llm_client = llm_client
        self.entry_repository = entry_repository

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
        """
        logger.info(f"Parseando importación de {source.value} para user {user_id}")

        warnings: list[str] = []

        # Si la lista excede el límite que se envía a Claude, avisar de que el
        # análisis será parcial en lugar de callar el truncado.
        if len(content) > MAX_PARSE_CONTENT_CHARS:
            warnings.append(
                "La lista es muy larga y se ha analizado solo una parte. "
                "Considera dividirla en dos importaciones."
            )

        # Construir prompt según la fuente
        format_description = self._get_format_description(source)
        prompt = self._build_parse_prompt(source, format_description, content)

        try:
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

            # Validar y convertir a ParsedEntry
            entries = []

            for item in parsed_data:
                try:
                    entry = ParsedEntry(**item)
                    entries.append(entry)
                except Exception as e:
                    title = item.get("title", "Desconocido")
                    warnings.append(f"Error al validar '{title}': {str(e)}")
                    logger.warning(f"Error validando entrada: {e}")

            # Detectar duplicados contra la colección del usuario
            await self._mark_duplicates(entries, user_id, warnings)

            logger.info(
                f"Parseo exitoso: {len(entries)} entradas, {len(warnings)} advertencias"
            )
            return ImportParseResponse(entries=entries, warnings=warnings)

        except Exception as e:
            logger.error(f"Error al parsear importación: {e}")
            raise

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
                await self.entry_repository.create(user_id=UUID(user_id), data=entry_data)
                created += 1
                logger.debug(f"Entrada '{entry.title}' creada exitosamente")

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
