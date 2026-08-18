# Sesión de Trabajo — 13 de Agosto de 2026: Acceptance tests E2E con Playwright

## Resumen

Ampliación de la suite E2E de Playwright (`apps/e2e`) de smoke tests superficiales (~28) a acceptance tests que cubren el happy path de los 8 flujos principales de GlyphLog (colección, detalle/eliminación, progreso, perfil/logout, importación, recomendaciones y GlyphAI), siguiendo el flujo SDD (spec → plan → tasks → código → tests → validación).

## Cambios realizados

- **RF-0 (auth):** corregido `auth-helper.ts` — el token se escribía en `localStorage` con clave `'token'`; ahora en `sessionStorage` con clave `glyphlog_access_token` (la real, ADR-004).
- **Helpers:** `utils/test-config.ts` (nuevo) centraliza `API_BASE_URL`; `utils/helpers.ts` añade `createEntryViaApi` (multipart, igual que el frontend).
- **Mocks LLM:** `fixtures/llm-mocks.ts` (nuevo) mockea `import/parse`, `import/execute`, `recommendations/generate` y `ai/chat` (streaming SSE) con `page.route()`.
- **Page objects:** ampliados `CollectionPage`, `CreateEntryPage`, `ProfilePage`; nuevos `EntryDetailPage`, `ImportPage`, `RecommendationsPage`, `ChatPage`.
- **Specs:** nuevos `collection.spec.ts`, `entry-detail.spec.ts`, `progress.spec.ts`, `import.spec.ts`, `recommendations.spec.ts`, `chat.spec.ts`; ampliados `profile.spec.ts`.

## Bugs descubiertos y corregidos durante la implementación

1. **Dominio email `.test` rechazado:** `email_validator` (backend) rechaza `@glyphlog.test`. Migrado a `@example.com` (dominio reservado, aceptado). Afectaba a todos los helpers y specs preexistentes.
2. **Proxy Vite roto en Docker:** `page.request` usaba rutas relativas (`/api/v1/...`) que pasan por el proxy Vite dentro del contenedor `web`, donde no se resuelve `localhost:8000`. Los helpers ahora usan `API_BASE_URL` absoluto. El frontend en navegador ya usaba `VITE_API_URL` directo.
3. **Rate limiting bloqueaba la suite:** `rate_limit_register=3/minute` saturaba con ~47 registros en paralelo → 429. Relajado a `100/minute` en `docker-compose.yml` (solo dev).
4. **Selectores frágiles:** `CardTitle` de shadcn renderiza `<div>` (no heading accesible); los `<select>` nativos usan `id={field.name}` sin asociarse al `FormLabel`. Ajustados los page objects a selectores por texto exacto / id fijo.

## Decisiones

- **Estrategia de datos:** BD real + usuarios únicos vía `POST /api/v1/auth/register` (sin reset/seed), emails con timestamp.
- **LLM mockeado** para import/recomendaciones/chat (determinista, sin coste); el resto contra backend real.
- **Browsers:** Chromium en CI (`pnpm test:e2e`), 3 browsers en local (`pnpm test`).
- **Rate limiting dev** relajado en `docker-compose.yml`, no en `config.py` (los defaults de producción se mantienen intactos).

## Validación

- `npx tsc --noEmit` → 0 errores (añadida lib `DOM` al tsconfig de e2e).
- `npx playwright test --project=chromium` → **47 passed** (15.7s).
- Los tests de import/recomendaciones/chat no dependen de Bedrock ni consumen tokens.

## Pendiente

- Ejecutar los 3 browsers en local (`pnpm test`) para validar firefox/webkit (aún no instalados en este entorno).
- Opcional: unificar el `registerTestUser` duplicado en `login.spec.ts` para que use `auth-helper.ts`.
- Revisar si el rate limiting relajado debe ir también en `.env.example` con un comentario.
