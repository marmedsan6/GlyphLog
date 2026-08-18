# [FEAT] Recomendaciones en el chat de GlyphAI

> **Estado:** backlog
> **Prioridad:** alta
> **Dependencias:** ninguna

## Contexto

GlyphAI (`/chat`) y el sistema de recomendaciones (`/recommendations`) existen por separado. La barra de escritura del chat no tiene selector de funciones, y el prompt de recomendaciones no usa los géneros del usuario (`Entry.genres` ya está autopopulado desde AniList/RAWG, pero `favorite_genres` es un placeholder vacío). Las recomendaciones generadas no se persisten ni quedan disponibles para refinar por chat.

## Objetivo

Integrar las recomendaciones dentro del chat de GlyphAI: un botón "+" que, tras elegir obligatoriamente el tipo (anime/manga/videojuego), genere 5 recomendaciones basadas en la lista y los géneros del usuario, las muestre como tarjetas en la conversación, las persista para refinar por chat y permita añadirlas a "Plan to Watch".

## Especificación

**Spec:** [`docs/specs/SPEC-glyphai-recommendations.md`](../specs/SPEC-glyphai-recommendations.md) — estado `aprobada`
**Contrato:** `POST /api/v1/ai/recommendations`; schemas `GenerateChatRecommendationsRequest`/`Response` y `ChatMessageResponse.metadata`; columna `metadata JSON` en `chat_messages`; edge cases: <5 entradas, sin entradas del tipo, géneros null, catálogo caído, proveedor LLM caído, `external_url` de juegos → RAWG.

## Tareas técnicas

- [ ] Backend — añadir columna `metadata JSON NULL` a `ChatMessage` y su migración Alembic.
- [ ] Backend — `ConversationRepository.add_message` y `ConversationService.add_message` aceptan `metadata`.
- [ ] Backend — `ChatMessageResponse` expone `metadata`.
- [ ] Backend — schemas `GenerateChatRecommendationsRequest` y `GenerateChatRecommendationsResponse`.
- [ ] Backend — `RecommendationService`: prompt con géneros, `favorite_genres` calculado, `external_url` de juegos → RAWG.
- [ ] Backend — nuevo endpoint `POST /ai/recommendations` (persistir mensaje user + assistant con content textual y metadata).
- [ ] Frontend — `ai.service.ts`: `generateChatRecommendations(type, conversationId?)`.
- [ ] Frontend — `useAIChat`: `AIChatMessage.metadata` + flujo de generación de recomendaciones.
- [ ] Frontend — `chat-input.tsx`: botón "+" con `DropdownMenu` y selector obligatorio de tipo.
- [ ] Frontend — nuevo `chat-recommendation-list.tsx` + render en `chat-message.tsx`.
- [ ] Frontend — `chat.page.tsx`: mapear `metadata` del historial y conectar el selector.
- [ ] Tests — pytest (servicio y endpoint), Vitest/RTL (selector, tarjetas, añadir), Playwright (flujo con LLM mockeado).

## Criterios de aceptación

- ✅ El usuario ve un botón "+" en la barra de `/chat` y puede elegir la función "Recomendaciones".
- ✅ Elegir tipo es obligatorio (anime/manga/videojuego) antes de generar.
- ✅ Se generan 5 recomendaciones basadas en lista + géneros y se muestran como tarjetas (portada, % match, razón, géneros, similar a, añadir).
- ✅ `POST /api/v1/ai/recommendations` devuelve 200 con `conversation_id`, `recommendations` y `metadata`.
- ✅ La lista se persiste en la conversación y se reconstruye al recargar; el agente puede refinar por chat.
- ✅ Cada tarjeta permite añadir a "Plan to Watch" con `useCreateEntry`.
- ✅ Colección < 5 entradas o sin entradas del tipo → 422 con mensaje claro.
- ✅ Los tests relevantes pasan y el código sigue las convenciones de AGENTS.md.

## Notas técnicas

- Reutilizar `RecommendationService` (no reescribir), `Entry.genres`, `useCreateEntry`, `map_llm_error` y los componentes shadcn/ui `DropdownMenu`/`Dialog`/`Select`.
- La persistencia usa un único mensaje `assistant`: `content` textual (para que el agente refina) + `metadata` JSON `{ "recommendations": [...] }` (para render al recargar).
- El `content` textual de la lista es el puente con el agente: en turnos posteriores entra como historial.

## Archivos relevantes

- `apps/api/app/models/conversation.py`
- `apps/api/app/repositories/conversation_repository.py`
- `apps/api/app/services/conversation_service.py`
- `apps/api/app/schemas/ai.py`
- `apps/api/app/schemas/recommendation.py`
- `apps/api/app/services/recommendation_service.py`
- `apps/api/app/routers/ai.py`
- `apps/web/src/services/ai.service.ts`
- `apps/web/src/hooks/useAIChat.ts`
- `apps/web/src/components/shared/chat/chat-input.tsx`
- `apps/web/src/components/shared/chat/chat-message.tsx`
- `apps/web/src/pages/chat/chat.page.tsx`
