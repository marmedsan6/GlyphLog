# [FEAT] Descubrimiento de YouTube en el chat de GlyphAI

> **Estado:** backlog
> **Prioridad:** media
> **Dependencias:** [FEAT-glyphai-recommendations](./FEAT-glyphai-recommendations.md) (patrón de integración en el chat)

## Contexto

GlyphAI (`/chat`) tiene ahora un selector de funciones ("botón +") con la opción de recomendaciones, que ya estableció el patrón de integración: endpoint híbrido en `ai.py` que delega en un servicio existente y persiste el resultado como mensaje `assistant` con `content` textual + `metadata` estructurado (columna `chat_messages.metadata`). El descubrimiento de YouTube (`/discover/youtube`) ya existe por separado con su `YoutubeDiscoveryService` y tarjetas de sugerencia, pero no está accesible desde el chat.

## Objetivo

Integrar el descubrimiento de YouTube como segunda herramienta del "+" de GlyphAI: el usuario pega hasta 5 URLs de canales, recibe las sugerencias como tarjetas dentro de la conversación, persistidas para refinar por chat, y añadibles a "Plan to Watch".

## Especificación

**Spec:** [`docs/specs/SPEC-glyphai-youtube-discovery.md`](../specs/SPEC-glyphai-youtube-discovery.md) — estado `aprobada`
**Contrato:** `POST /api/v1/ai/youtube`; schemas `GenerateChatYoutubeRequest`/`Response`; reutiliza `chat_messages.metadata` (sin migraciones nuevas); edge cases: URLs inválidas, API key ausente, análisis lento (60–90s), cuota agotada, sin menciones.

## Tareas técnicas

- [ ] Backend — schemas `GenerateChatYoutubeRequest` y `GenerateChatYoutubeResponse`.
- [ ] Backend — `YoutubeDiscoveryService.format_suggestions_as_text(suggestions)`.
- [ ] Backend — endpoint `POST /ai/youtube` (resolver conversación, delegar al servicio, persistir user + assistant con metadata, mapear errores).
- [ ] Frontend — `youtube-discovery.service.ts`: `generateChatYoutubeDiscovery(channelUrls, conversationId?)`.
- [ ] Frontend — `useAIChat`: `ChatMessageMetadata.suggestions`, acción `generateYoutubeDiscovery`, estado `isGeneratingYoutube`.
- [ ] Frontend — `chat-input.tsx`: opción "Descubrimiento YouTube" en el "+" + panel (Popover) para pegar URLs.
- [ ] Frontend — nuevo `chat-youtube-suggestion-list.tsx` + render en `chat-message.tsx`.
- [ ] Frontend — `chat.page.tsx`: mapear `metadata.suggestions`, conectar panel e indicador "analizando…".
- [ ] Tests — pytest (endpoint y formateador), Vitest/RTL (panel, tarjetas, añadir), Playwright (flujo con LLM mockeado).

## Criterios de aceptación

- ✅ El usuario ve la opción "Descubrimiento YouTube" en el desplegable del "+".
- ✅ Puede pegar hasta 5 URLs de canales y lanzar el análisis.
- ✅ Las sugerencias aparecen como tarjetas (título, tipo, opinión, rating, vídeo, añadir) en el chat.
- ✅ `POST /api/v1/ai/youtube` devuelve 200 con `conversation_id`, `suggestions` y `metadata`.
- ✅ Las sugerencias se persisten en la conversación y se reconstruyen al recargar; el agente puede refinar por chat.
- ✅ Cada tarjeta permite añadir a "Plan to Watch".
- ✅ URLs inválidas/vacías → 422; API key ausente → 503; sin menciones → mensaje claro.
- ✅ Los tests relevantes pasan y el código sigue las convenciones de AGENTS.md.

## Notas técnicas

- Reutilizar `YoutubeDiscoveryService.analyze_channels` (no reescribir), `chat_messages.metadata`, `addSuggestionToCollection`, `Popover`/`Textarea` y las tarjetas `YoutubeSuggestionCard` (versión compacta).
- Los canales se pegan en cada análisis (no localStorage ni BD); persistirlos por usuario queda fuera de alcance.
- Latencia 60–90s: el resultado llega como un único mensaje al terminar, con indicador "analizando tus canales…".

## Archivos relevantes

- `apps/api/app/schemas/youtube_discovery.py`
- `apps/api/app/services/youtube_discovery_service.py`
- `apps/api/app/routers/ai.py`
- `apps/web/src/services/youtube-discovery.service.ts`
- `apps/web/src/hooks/useAIChat.ts`
- `apps/web/src/components/shared/chat/chat-input.tsx`
- `apps/web/src/components/shared/chat/chat-message.tsx`
- `apps/web/src/pages/chat/chat.page.tsx`
