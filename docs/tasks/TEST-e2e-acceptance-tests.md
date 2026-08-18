# [TEST] Suite de Acceptance Tests E2E — tarea paraguas

> **Estado:** completada
> **Prioridad:** alta
> **Dependencias:** ninguna

## Contexto

La suite E2E de Playwright (`apps/e2e`) solo tenía smoke tests superficiales. Se amplió para cubrir el happy path de los 8 flujos de negocio de GlyphLog, corrigiendo el bug de autenticación y añadiendo mocks del LLM para los flujos que dependen de Claude/Bedrock.

## Objetivo

Transformar la suite E2E de smoke tests a acceptance tests que validen los flujos principales contra el backend real.

## Especificación

**Spec:** [`docs/specs/SPEC-e2e-acceptance-tests.md`](../specs/SPEC-e2e-acceptance-tests.md) — estado `implementada`
**Contrato:** flujos RF-0 (auth) a RF-7 (chat); BD real + usuarios únicos vía API; LLM mockeado con `page.route()`.

## Tareas técnicas

Esta tarea agrupa 8 sub-tareas, cada una con su task doc:

- [x] RF-0 — Corregir auth-helper (sessionStorage + `glyphlog_access_token`)
- [x] RF-1 — Colección: vacío, listado, filtros, orden, búsqueda
- [x] RF-2 — Detalle y eliminación de entrada
- [x] RF-3 — Progreso: configurar total + actualizar
- [x] RF-4 — Perfil (username/bio, dispositivos) + logout
- [x] RF-5 — Importación de listas (mock LLM)
- [x] RF-6 — Recomendaciones (mock LLM)
- [x] RF-7 — GlyphAI chat (mock SSE)

## Criterios de aceptación

- ✅ Los 8 flujos tienen acceptance tests en `apps/e2e/e2e-tests/tests/`.
- ✅ `npx tsc --noEmit` pasa sin errores.
- ✅ `npx playwright test --project=chromium` → 47 passing.
- ✅ Ningún test protegido redirige inesperadamente a `/login`.
- ✅ Los mocks LLM no dependen de Bedrock ni consumen tokens.

## Notas técnicas

- **Bug de dominio email corregido**: el validador `email_validator` rechaza `.test`; se migró a `@example.com` (dominio reservado).
- **Bug de proxy corregido**: `page.request` usaba el proxy Vite (que no resuelve el backend en Docker); ahora usa `API_BASE_URL` absoluto (`http://localhost:8000/api/v1`).
- **Rate limiting dev**: `docker-compose.yml` relaja `RATE_LIMIT_REGISTER`/`RATE_LIMIT_LOGIN` a `100/minute` para permitir la suite (en prod se usan los defaults estrictos).
- **`tsconfig.json`**: añadida lib `DOM` (requerida por `sessionStorage`/`localStorage` en tests).

## Archivos relevantes

- `apps/e2e/e2e-tests/utils/auth-helper.ts`
- `apps/e2e/e2e-tests/utils/helpers.ts`
- `apps/e2e/e2e-tests/utils/test-config.ts`
- `apps/e2e/e2e-tests/fixtures/llm-mocks.ts`
- `apps/e2e/e2e-tests/page-objects/*.ts`
- `apps/e2e/e2e-tests/tests/**/*.spec.ts`
- `docker-compose.yml`
- `apps/e2e/tsconfig.json`
