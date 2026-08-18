# [SPEC] Descubrimiento de YouTube en el chat de GlyphAI

> **Estado:** aprobada
> **Prioridad:** media
> **Dependencias:** [SPEC-glyphai-recommendations](../specs/SPEC-glyphai-recommendations.md) (patrón de integración en el chat)
> **Plan/Task derivado:** `docs/tasks/FEAT-glyphai-youtube-discovery.md`

## Contexto

GlyphLog ya dispone de un sistema de **descubrimiento desde YouTube** construido y en producción:

- **Backend**: `YoutubeDiscoveryService.analyze_channels(user_id, channel_urls)` (`apps/api/app/services/youtube_discovery_service.py`) que, dado hasta 5 canales, obtiene sus últimos 20 vídeos, extrae transcripts, analiza con Claude/Bedrock, cruza con la colección del usuario y devuelve sugerencias (`YoutubeSuggestion`) + metadata. Expuesto vía `POST /api/v1/discover/youtube/analyze` (`apps/api/app/routers/youtube_discovery.py`).
- **Frontend**: página `/discover/youtube` con gestión de canales en `localStorage` (`useYoutubeChannels`), análisis (`useAnalyzeChannels`) y tarjetas de sugerencia (`YoutubeSuggestionCard`).

En paralelo, GlyphAI (`/chat`) tiene ahora un **selector de funciones ("botón +")** en la barra de escritura, cuyo primer caso de uso (recomendaciones) ya estableció el patrón de integración: endpoint híbrido en `apps/api/app/routers/ai.py` que delega en un servicio existente y **persiste el resultado como mensaje `assistant` con `content` textual + `metadata` estructurado** (columna `chat_messages.metadata`), renderizado como tarjetas dentro de la conversación y refinable por chat.

Esta spec integra el descubrimiento de YouTube como una segunda herramienta del "+" de GlyphAI, reutilizando ese mismo patrón.

## Objetivo

Permitir que el usuario, desde el chat de GlyphAI, pegue hasta 5 URLs de canales de YouTube y reciba las sugerencias de anime/manga/videojuegos mencionadas por esos creadores, mostradas como tarjetas dentro de la conversación, persistidas para poder refinarlas por chat, y añadibles a su colección.

## Requisitos funcionales

- **RF-1** — Como usuario, quiero una opción "Descubrimiento YouTube" en el desplegable del botón "+" de `/chat`, para lanzar el análisis sin salir del chat.
- **RF-2** — Como usuario, quiero que al elegir esa opción se me muestre un panel para pegar las URLs de los canales (hasta 5, una por línea), para indicar qué creadores analizar.
- **RF-3** — Como usuario, quiero que al confirmar se analicen los canales y las sugerencias aparezcan como tarjetas dentro de la conversación (título, tipo, opinión, rating, vídeo y botón "Añadir").
- **RF-4** — Como usuario, quiero poder añadir una sugerencia a mi colección en estado "Plan to Watch" directamente desde la tarjeta del chat.
- **RF-5** — Como usuario, quiero que las sugerencias queden guardadas en la conversación, para poder seguir conversando con GlyphAI y refinar la respuesta en turnos posteriores.
- **RF-6** — Como usuario, quiero que las sugerencias persistidas se reconstruyan al recargar la conversación.
- **RF-7** — Como usuario, quiero ver un indicador de progreso ("analizando tus canales…") mientras el análisis se ejecuta, dado que puede tardar 60–90 segundos.

## API contract

### Endpoint nuevo

```
POST /api/v1/ai/youtube
```

Autenticado (Bearer token). Analiza los canales indicados delegando en `YoutubeDiscoveryService` y persiste las sugerencias en la conversación como un mensaje del asistente.

### Request

| Campo             | Tipo               | Obligatorio | Descripción                                                              |
| ----------------- | ------------------ | ----------- | ------------------------------------------------------------------------ |
| `channel_urls`    | `string[]`         | Sí          | URLs de canales de YouTube (1 a 5).                                      |
| `conversation_id` | `UUID \| null`     | No          | Conversación a la que asociar el resultado. Si se omite, se crea una.   |

```json
{
  "channel_urls": [
    "https://www.youtube.com/@TheAnimeMan",
    "https://www.youtube.com/@Gigguk"
  ],
  "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

### Response

| Status | Body                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| `200`  | `{ "conversation_id": UUID, "suggestions": [YoutubeSuggestion, ...], "metadata": AnalysisMetadata }`            |

```json
{
  "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "suggestions": [
    {
      "title": "Death Note",
      "type": "anime",
      "mentioned_by": "The Anime Man",
      "video_title": "Top 10 Psychological Thrillers",
      "video_url": "https://www.youtube.com/watch?v=...",
      "opinion": "positive",
      "rating": 9,
      "timestamp": "3:42",
      "in_collection": false,
      "external_url": null,
      "cover_image_url": null
    }
  ],
  "metadata": {
    "channels_analyzed": 2,
    "videos_analyzed": 40,
    "titles_found": 12,
    "new_suggestions": 9,
    "tokens_used": 0,
    "analyzed_at": "2026-08-15T12:00:00Z"
  }
}
```

### Errores

| Status | Cuándo                                                          | Body                                                              |
| ------ | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `401`  | Sin token o token inválido                                      | `{ "detail": "Not authenticated" }`                                |
| `404`  | `conversation_id` no existe o pertenece a otro usuario           | `{ "detail": "Conversación no encontrada" }`                       |
| `422`  | `channel_urls` vacío o con más de 5 elementos                    | `{ "detail": "..." }` (validación Pydantic)                        |
| `400`  | Ninguna URL de canal válida o error de validación del servicio   | `{ "detail": "..." }` (mensaje claro y accionable)                 |
| `503`  | `YOUTUBE_API_KEY` no configurada                                 | `{ "detail": "YouTube discovery no está disponible..." }`          |
| `500`  | Error interno durante el análisis                                | `{ "detail": "Error al analizar canales de YouTube..." }`          |

### Endpoint existente (sin cambios de contrato)

`POST /api/v1/discover/youtube/analyze` mantiene request/response y status codes. No se modifica; el nuevo endpoint reutiliza su `YoutubeDiscoveryService`.

## Schemas Pydantic

### Nuevos

```python
class GenerateChatYoutubeRequest(BaseModel):
    channel_urls: list[str] = Field(..., min_length=1, max_length=5)
    conversation_id: UUID | None = None


class GenerateChatYoutubeResponse(BaseModel):
    conversation_id: UUID
    suggestions: list[YoutubeSuggestion]
    metadata: AnalysisMetadata
```

`YoutubeSuggestion` y `AnalysisMetadata` se reutilizan de `app/schemas/youtube_discovery.py` sin cambios de forma.

## Data models

Sin cambios en el modelo de datos. Se reutiliza la columna `chat_messages.metadata` (JSON, ya existente tras `SPEC-glyphai-recommendations`) para persistir el payload `{ "suggestions": [...] }`. No se crean tablas ni migraciones nuevas. Los canales **no** se persisten: se envían en cada request desde el chat (fuera de alcance persistirlos en BD).

## Persistencia del mensaje de sugerencias

Al analizar, el backend persiste **un único mensaje `assistant`** en la conversación con dos representaciones:

- `content`: resumen textual legible (título, tipo, canal, vídeo y opinión de cada sugerencia), que el agente recibe como historial en turnos posteriores para refinar.
- `metadata`: `{ "suggestions": [YoutubeSuggestion, ...] }` para que el frontend renderice las tarjetas al recargar la conversación.

El `role` es `assistant`. El mensaje del usuario que "dispara" el análisis se persiste como `user` (con las URLs pegadas) antes que el de sugerencias.

## Edge cases

- [ ] `channel_urls` vacío o > 5 → `422` (validación Pydantic en el request).
- [ ] URLs no válidas o sin channel ID extraíble → el servicio las salta (`continue`); si ninguna es válida, devuelve lista vacía con `metadata.channels_analyzed = 0` y el frontend muestra un mensaje claro.
- [ ] `YOUTUBE_API_KEY` no configurada → `503`; no se persiste mensaje de sugerencias.
- [ ] Vídeos sin transcript → fallback a título + descripción (comportamiento existente del servicio).
- [ ] Claude no extrae menciones → lista vacía con `metadata.titles_found = 0`; se persiste un mensaje "No encontré menciones".
- [ ] Análisis lento (60–90s) → el frontend muestra "analizando tus canales…" y deshabilita el input mientras tanto.
- [ ] `conversation_id` de otro usuario → `404`, sin filtrar datos ajenos.
- [ ] Recargar conversación con sugerencias persistidas → el frontend renderiza las tarjetas desde `metadata.suggestions`.
- [ ] Cuota de YouTube API agotada (`HttpError` 403/429) → el servicio devuelve lista vacía; el endpoint responde 200 con lista vacía y metadata (degradación graceful, no 500).

## Fuera de alcance

- ❌ Persistir los canales de YouTube en BD por usuario (los canales se pegan en cada análisis). Se evaluará en una iteración posterior.
- ❌ Enriquecimiento de sugerencias con portadas/URLs de AniList/IGDB (los campos `external_url`/`cover_image_url` se dejan como `None`, igual que hoy).
- ❌ Cálculo real de `tokens_used` (queda como 0, igual que el endpoint existente).
- ❌ Streaming por fases del análisis; el resultado llega como un único mensaje al terminar.
- ❌ Tool de LangGraph `analyze_youtube` para invocación automática por el agente (solo opción explícita del "+" en esta iteración).
- ❌ Cambios en la página `/discover/youtube`.

## Criterios de salida

- [ ] API contract completo del endpoint nuevo (request, response, status codes y errores).
- [ ] Schemas Pydantic a nivel de campo, con tipos y validaciones.
- [ ] Persistencia de la lista en la conversación definida (content textual + metadata estructurado).
- [ ] Reutilización de `YoutubeDiscoveryService` y `chat_messages.metadata` explicitada (sin migraciones nuevas).
- [ ] Edge cases enumerados y convertibles en tests.
- [ ] Sin implementación ni detalles de plan (los "cómo" van al plan, no a la spec).
- [ ] Los tests de aceptación pueden escribirse solo leyendo esta spec.
