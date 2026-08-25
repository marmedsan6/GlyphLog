# [FEAT] GlyphAI — renderizar respuestas en Markdown seguro

> **Estado:** completada
> **Prioridad:** media
> **Dependencias:** ninguna

## Contexto

`ChatMessage` muestra actualmente las respuestas de GlyphAI como texto plano con
`whitespace-pre-wrap`. Esto dificulta distinguir encabezados, listas, énfasis,
enlaces, tablas y bloques de código en respuestas largas.

## Objetivo

Renderizar las respuestas del asistente con CommonMark y GFM útil, manteniendo
la seguridad del contenido generado por el modelo y el comportamiento existente
del chat.

## Especificación

**Tier:** 2 — feature pequeña centrada en un componente.

- **API contract:** sin cambios en endpoints, requests, responses o SSE.
- **Schemas:** `AIChatMessage` y `ChatMessageMetadata` no cambian.
- **Comportamiento:** solo los mensajes `assistant` usan Markdown; los mensajes
  `user`, estados de streaming y tarjetas estructuradas conservan su renderizado.
- **Seguridad:** usar `react-markdown` con `remark-gfm`, `skipHtml`, sin
  `rehypeRaw`, transformador seguro de URLs y enlaces externos con
  `target="_blank"` + `rel="noopener noreferrer"`.
- **Fuera de alcance:** backend, resaltado de sintaxis, copiar código y nuevas
  tarjetas de dominio.

## Tareas técnicas

- [x] Añadir `react-markdown` y `remark-gfm` al workspace web.
- [x] Integrar el renderer Markdown seguro y sus estilos en `ChatMessage`.
- [x] Mantener tarjetas de recomendaciones/YouTube y estados de streaming.
- [x] Añadir tests de Markdown, seguridad, imágenes, streaming y tarjetas.
- [x] Registrar ADR y delta de bundle antes/después.
- [x] Ejecutar test, lint, typecheck y build del frontend.

## Criterios de aceptación

- ✅ Las respuestas del asistente muestran CommonMark y GFM útil.
- ✅ Los mensajes del usuario permanecen como texto plano.
- ✅ HTML crudo y URLs inseguras no ejecutan scripts ni insertan HTML no confiable.
- ✅ Los enlaces externos abren en una pestaña nueva sin exponer `window.opener`.
- ✅ Las imágenes seguras se renderizan con atributos defensivos.
- ✅ Las tarjetas de recomendaciones y YouTube siguen apareciendo.
- ✅ Los estados de streaming siguen funcionando.
- ✅ Tests específicos de `ChatMessage`, ESLint, typecheck y build pasan.

## Notas técnicas

- Elección y comparación con `markdown-to-jsx`: [`memory-bank/decisions.md`](../../memory-bank/decisions.md), ADR-016.
- La suite frontend completa queda con 19 fallos preexistentes en los tests de
  YouTube porque el entorno de Vitest no expone `localStorage`; los mismos
  fallos se reproducen sobre `HEAD` sin esta feature.
- Issue original: [#65](https://github.com/marmedsan6/GlyphLog/issues/65).

## Archivos relevantes

- `apps/web/src/components/shared/chat/chat-message.tsx`
- `apps/web/src/components/shared/chat/chat-message.test.tsx`
- `apps/web/package.json`
