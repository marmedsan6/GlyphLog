# [SPEC] Recomendaciones en el chat de GlyphAI

> **Estado:** aprobada
> **Prioridad:** alta
> **Dependencias:** ninguna
> **Plan/Task derivado:** `docs/tasks/FEAT-glyphai-recommendations.md`

## Contexto

GlyphLog ya dispone de dos piezas construidas y en producción que hoy no dialogan entre sí:

1. **GlyphAI** (`apps/api/app/routers/ai.py`, `apps/api/app/services/agent_service.py`): chat conversacional con streaming SSE, agente ReAct (LangGraph + AWS Bedrock Claude Haiku 4.5), historial persistente (`Conversation` / `ChatMessage`) y contexto RAG de la colección del usuario inyectado en el system prompt.
2. **Sistema de recomendaciones** (`apps/api/app/routers/recommendations.py`, `apps/api/app/services/recommendation_service.py`): endpoint `POST /api/v1/recommendations/generate` que serializa las 30 entradas mejor puntuadas del usuario a texto, pide a Claude un JSON de recomendaciones y lo enriquece con portadas/metadatos de AniList/RAWG. Existe su propia página (`/recommendations`) con tarjetas.

Limitaciones detectadas que motivan esta spec:

- La barra de escritura del chat (`apps/web/src/components/shared/chat/chat-input.tsx`) solo tiene `<Textarea>` + botón de enviar. No existe el selector de funciones tipo "botón +" de ChatGPT.
- El prompt de recomendaciones **no usa los géneros**: `RecommendationService._build_recommendation_prompt()` solo envía `title, type, status, rating`, y `_calculate_metadata()` deja `favorite_genres` como placeholder vacío, aunque `Entry.genres` ya existe (JSON, autopopulado desde AniList/RAWG).
- Las recomendaciones generadas en `/recommendations` no se persisten ni quedan disponibles para que el agente del chat las refina.

## Objetivo

Integrar las recomendaciones dentro del chat de GlyphAI: un selector de funciones ("botón +") en la barra de escritura de la página `/chat` que, tras elegir obligatoriamente un tipo (anime/manga/videojuego), genere 5 recomendaciones personalizadas en base a la lista y los géneros del usuario, las muestre como tarjetas dentro de la conversación, las persista para que el agente pueda refinarlas por chat, y permita añadir cada recomendación a "Plan to Watch".

## Requisitos funcionales

- **RF-1** — Como usuario, quiero un botón "+" en la barra de escritura de `/chat` que abra un desplegable con la función "Recomendaciones", para descubrir contenido sin salir del chat.
- **RF-2** — Como usuario, quiero que al seleccionar "Recomendaciones" se me pida elegir obligatoriamente entre anime, manga o videojuego, para que las recomendaciones se generen solo sobre ese tipo.
- **RF-3** — Como usuario, quiero que al confirmar el tipo se generen 5 recomendaciones personalizadas a partir de mi lista y mis géneros, y se muestren como tarjetas dentro de la conversación (portada, % match, razón, géneros, "similar a", botón "Añadir").
- **RF-4** — Como usuario, quiero poder añadir una recomendación a mi colección en estado "Plan to Watch" directamente desde la tarjeta del chat.
- **RF-5** — Como usuario, quiero que la lista de recomendaciones quede guardada en la conversación, para poder seguir conversando con GlyphAI y refinar la respuesta (filtrar, descartar, pedir más de un tipo, etc.) en turnos posteriores.
- **RF-6** — Como usuario, quiero que la lista persistida se reconstruya al recargar la conversación, para no perder las recomendaciones ni el contexto de refinado.
- **RF-7** — Como usuario, quiero que las recomendaciones se basen en mis géneros favoritos además de mi lista, para que el resultado sea más afín a mis gustos.

## API contract

### Endpoint nuevo

```
POST /api/v1/ai/recommendations
```

Autenticado (Bearer token). Genera la lista de recomendaciones delegando en el servicio de recomendaciones existente y la persiste en la conversación como un mensaje del asistente.

### Request

| Campo            | Tipo                     | Obligatorio | Descripción                                                                 |
| ---------------- | ------------------------ | ----------- | --------------------------------------------------------------------------- |
| `type`           | `"anime" \| "manga" \| "game"` | Sí     | Tipo de entrada sobre el que se generan las recomendaciones.                |
| `conversation_id`| `UUID \| null`           | No          | Conversación a la que se asocia la lista. Si se omite, se crea una nueva.  |

```json
{
  "type": "anime",
  "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

### Response

| Status | Body                                                                                     |
| ------ | ---------------------------------------------------------------------------------------- |
| `200`  | `{ "conversation_id": UUID, "recommendations": [Recommendation, ...], "metadata": RecommendationMetadata }` |

```json
{
  "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recommendations": [
    {
      "title": "Steins;Gate",
      "type": "anime",
      "match_percentage": 92,
      "reason": "Mezcla ciencia ficción y thriller psicológico como tus mejor puntuados.",
      "genres": ["Sci-Fi", "Thriller"],
      "year": 2011,
      "external_url": "https://anilist.co/search/Steins%3BGate",
      "cover_image_url": "https://...",
      "similar_to": ["Attack on Titan"]
    }
  ],
  "metadata": {
    "analyzed_entries": 12,
    "favorite_genres": ["Sci-Fi", "Action", "Drama"],
    "avg_rating": 8.2,
    "completion_rate": 66.7,
    "tokens_used": null,
    "model": "claude-haiku-4.5"
  }
}
```

### Errores

| Status | Cuándo                                                        | Body                                                            |
| ------ | ------------------------------------------------------------- | --------------------------------------------------------------- |
| `401`  | Sin token o token inválido                                    | `{ "detail": "Not authenticated" }`                              |
| `404`  | `conversation_id` no existe o pertenece a otro usuario         | `{ "detail": "Conversación no encontrada" }`                     |
| `422`  | `type` ausente o inválido, o colección con < 5 entradas        | `{ "detail": "..." }` (mensaje claro y accionable)               |
| `502`  | El proveedor LLM devuelve formato inesperado                   | `{ "detail": "El proveedor de IA devolvio una respuesta inesperada..." }` |
| `503`  | Proveedor LLM no configurado o quota/rate limit agotado        | `{ "detail": "..." }` (mapeado por `map_llm_error`)              |
| `500`  | Error interno al generar recomendaciones                       | `{ "detail": "Error interno al generar recomendaciones" }`       |

### Endpoint existente modificado (comportamiento, sin cambio de contrato)

`POST /api/v1/recommendations/generate` mantiene request/response y status codes. El cambio es interno: el prompt que se envía al LLM pasa a incluir los géneros del usuario (por entrada y agregados como favoritos), y `metadata.favorite_genres` deja de ser un placeholder para devolver los géneros más frecuentes de la colección.

## Schemas Pydantic

### Nuevos

```python
class GenerateChatRecommendationsRequest(BaseModel):
    type: EntryType  # obligatorio: anime | manga | game
    conversation_id: UUID | None = None


class GenerateChatRecommendationsResponse(BaseModel):
    conversation_id: UUID
    recommendations: list[Recommendation]
    metadata: RecommendationMetadata
```

`Recommendation` y `RecommendationMetadata` se reutilizan de `app/schemas/recommendation.py` sin cambios de forma.

### Modificados

`ChatMessageResponse` (en `app/schemas/ai.py`) añade un campo `metadata` para transportar la lista estructurada persistida:

```python
class ChatMessageResponse(BaseModel):
    id: UUID
    role: ChatRole
    content: str
    metadata: dict | None = None  # nuevo: payload opcional (ej. {"recommendations": [...]})
    created_at: datetime
```

El `ChatMessage` del request (`app/schemas/ai.py`) **no cambia**: el cliente sigue enviando historial como `{role, content}`. El payload estructurado solo viaja de vuelta en la respuesta para render, y el refinado posterior usa el `content` textual.

## Data models

| Tabla          | Columna    | Tipo         | Restricciones                          |
| -------------- | ---------- | ------------ | -------------------------------------- |
| `chat_messages`| `metadata` | `JSON`       | `nullable` (nueva columna)             |

Nueva migración Alembic que añade `metadata JSON NULL` a `chat_messages`. No se crean tablas nuevas. `Entry.genres` (JSON, ya existente) pasa a leerse en el flujo de recomendaciones, sin cambios de esquema.

## Persistencia del mensaje de recomendaciones

Al generar la lista, el backend persiste **un único mensaje `assistant`** en la conversación con dos representaciones complementarias:

- `content`: resumen textual legible (títulos, tipo, % match y razón de cada recomendación), que el agente recibe como historial en turnos posteriores para poder refinar la respuesta.
- `metadata`: `{ "recommendations": [Recommendation, ...] }` con la lista estructurada, para que el frontend renderice las tarjetas al recargar la conversación.

El `role` del mensaje es `assistant`. El mensaje de usuario que "dispara" la generación (ej. "Recomiéndame animes") se persiste como `user` antes que el de recomendaciones, de modo que la conversación conserve el turno completo.

## Edge cases

- [ ] Colección con menos de 5 entradas → `422` con mensaje claro ("Necesitas al menos 5 entradas para recibir recomendaciones"). El frontend muestra el error sin bloquear el chat.
- [ ] Colección con entradas de un solo tipo distinto al elegido → `422` con mensaje ("No tienes entradas de tipo X"). 
- [ ] Entradas con `genres` en `null` → se omiten en el cálculo de `favorite_genres`; si ninguna tiene géneros, `favorite_genres` queda `[]` y el prompt usa solo la lista.
- [ ] Colección con más de 30 entradas con rating → el prompt sigue recortando a las 30 mejor puntuadas (comportamiento existente).
- [ ] Enriquecimiento externo (AniList/RAWG) lento o caído → la recomendación se devuelve sin `cover_image_url` ni `external_url` (degradación graceful, no rompe el flujo).
- [ ] Proveedor LLM falla (quota/rate limit) → `503`/`502` mapeado; no se persiste mensaje de recomendaciones.
- [ ] `conversation_id` de otro usuario → `404`, sin filtrar datos ajenos.
- [ ] Recargar conversación con lista persistida → el frontend renderiza las tarjetas desde `metadata.recommendations`; el agente recibe el `content` textual como historial.
- [ ] `type` para un juego → `external_url` apunta a RAWG, no a AniList (corrige el bug latente de `_enrich_recommendations`).

## Fuera de alcance

- ❌ Recomendaciones en el widget flotante de GlyphAI (solo en la página `/chat`).
- ❌ Elegir la cantidad de recomendaciones (fijo en 5). El selector de cantidad queda para una iteración posterior.
- ❌ Caché o persistencia de recomendaciones reutilizable entre conversaciones (tabla propia de recomendaciones).
- ❌ Recomendaciones por embeddings/pgvector o filtrado colaborativo: se mantiene la estrategia LLM + serialización a texto ya decidida.
- ❌ Cualquier cambio en la página `/recommendations` más allá del enriquecimiento del prompt compartido.
- ❌ Cross-browser o infraestructura de CI/CD nueva.

## Criterios de salida

- [ ] API contract completo del endpoint nuevo (request, response, status codes y errores).
- [ ] Schemas Pydantic a nivel de campo, con tipos y validaciones.
- [ ] Data models definidos (columna `metadata` en `chat_messages` + migración).
- [ ] Estrategia de persistencia de la lista en la conversación definida (content textual + metadata estructurado).
- [ ] Enriquecimiento del prompt de recomendaciones con géneros especificado.
- [ ] Edge cases enumerados y convertibles en tests.
- [ ] Sin implementación ni detalles de plan (los "cómo" van al plan, no a la spec).
- [ ] Los tests de aceptación pueden escribirse solo leyendo esta spec.
