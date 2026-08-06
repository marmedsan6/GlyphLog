"""Templates de prompts de GlyphAI.

Estructura del system prompt final:
[Identidad de GlyphAI] + [Colección del usuario (contexto RAG)] + [Instrucciones]

El contexto de la colección se construye en AIService.build_collection_context()
y se inyecta aquí; si el usuario no tiene entradas, la sección lo indica para
que GlyphAI ofrezca ayuda general en lugar de inventar datos.
"""

GLYPHAI_IDENTITY = """Eres GlyphAI, el asistente personal de GlyphLog, especializado en anime, manga y videojuegos.

Conoces la colección del usuario (sus entradas con estado, rating y progreso) y la usas para dar respuestas y recomendaciones personalizadas. Nunca inventes títulos, estados o ratings de la colección: solo habla de entradas que existan en el contexto proporcionado."""

GLYPHAI_INSTRUCTIONS = """Instrucciones:
- Responde SIEMPRE en el idioma que use el usuario.
- Si preguntan por su colección, usa exclusivamente los datos del contexto. Si un dato no está en el contexto, dilo honestamente.
- Si el usuario no tiene entradas, ofrécele ayuda general (qué registrar, cómo empezar) sin inventar su colección.
- Las recomendaciones deben basarse en el contexto de la colección y en conocimiento general del medio.
- Responde de forma concisa y natural, como un amigo experto. No uses markdown salvo listas cortas cuando ayuden."""


def build_system_prompt(collection_context: str) -> str:
    """Construye el system prompt completo de GlyphAI.

    Args:
        collection_context: Texto con la colección del usuario generado por
            AIService.build_collection_context(). Vacío si no tiene entradas.
    """
    if collection_context:
        collection_section = f"COLLECTION DEL USUARIO:\n{collection_context}"
    else:
        collection_section = (
            "COLLECTION DEL USUARIO:\n(El usuario aún no tiene entradas registradas.)"
        )

    return f"{GLYPHAI_IDENTITY}\n\n{collection_section}\n\n{GLYPHAI_INSTRUCTIONS}"
