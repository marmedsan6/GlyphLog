"""Construcción del contexto RAG de la colección para GlyphAI.

La estrategia RAG de GlyphLog no usa embeddings vectoriales: la colección
personal (<1000 entradas) se serializa a texto para el system prompt. Este
módulo centraliza esa lógica de serialización para que la reutilicen los
distintos consumidores (AIService y AgentService).
"""

from app.models.entry import Entry, EntryStatus

# Límites del contexto RAG (colección del usuario).
# El contexto nunca debe superar ~3000 tokens (aprox. 4 chars/token) para
# dejar margen al historial de conversación.
MAX_CONTEXT_TOKENS = 3000
MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * 4
# Colecciones mayores se recortan a las entradas más relevantes.
MAX_COLLECTION_ENTRIES = 200


def format_entry(entry: Entry) -> str:
    """Serializa una entrada a una línea del contexto, omitiendo nulls."""
    parts = [f"{entry.title} [{entry.type.value}] — {entry.status.value}"]
    if entry.genres:
        parts.append(f"géneros: {', '.join(entry.genres)}")
    if entry.rating is not None:
        parts.append(f"rating {entry.rating}/10")
    if entry.year is not None:
        parts.append(f"año {entry.year}")
    if entry.current_progress is not None or entry.progress_total is not None:
        current = entry.current_progress or 0
        total = entry.progress_total if entry.progress_total is not None else "?"
        parts.append(f"progreso {current}/{total}")
    if entry.notes:
        parts.append(f"notas: {entry.notes}")
    return ", ".join(parts)


def build_collection_context(entries: list[Entry]) -> str:
    """Construye el contexto de la colección a partir de una lista de entradas.

    Devuelve un bloque de texto estructurado (≤ ~3000 tokens) con título, tipo,
    estado, géneros, rating, año, progreso y notas de cada entrada. Vacío si la
    lista está vacía.
    """
    if not entries:
        return ""

    # 1. Priorizar: completed con rating → rating desc → más recientes.
    entries.sort(
        key=lambda e: (
            e.status == EntryStatus.completed and e.rating is not None,
            e.rating or 0,
            e.created_at,
        ),
        reverse=True,
    )
    # 2. Recorte por tamaño máximo de colección.
    entries = entries[:MAX_COLLECTION_ENTRIES]

    # 3. Recorte por presupuesto de tokens (~4 chars/token).
    lines = [format_entry(entry) for entry in entries]
    header = f"TU COLECCIÓN ({len(lines)} entradas):"
    context = f"{header}\n" + "\n".join(lines)
    while len(context) > MAX_CONTEXT_CHARS and len(lines) > 1:
        lines.pop()  # se descartan las menos prioritarias (final de la lista)
        context = f"{header}\n" + "\n".join(lines)
    return context
