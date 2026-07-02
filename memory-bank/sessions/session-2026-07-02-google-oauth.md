# Sesión 2026-07-02 — Implementación de Google OAuth

## Goal

Implementar login con Google OAuth en GlyphLog manteniendo el flujo email/password existente. El usuario podrá iniciar sesión o registrarse con un click en "Continuar con Google" desde las páginas `/login` y `/register`.

## Instructions

- Sesión operada con flag `--yolo` (bypass de permisos).
- Estilo: español, directo, sin emojis decorativos innecesarios.
- Plan → acción → verificación en cada paso.
- 3 historias INVEST divididas por dependencia: BD → backend → frontend.

## Discoveries

- `useGoogleLogin` de `@react-oauth/google` devuelve `access_token` OAuth 2.0, **NO** `id_token` JWT. Para `id_token` hay que usar `google.accounts.id` directamente. **Decisión documentada en ADR-006.**
- `google.oauth2.id_token.verify_oauth2_token` valida firma, `aud` y `exp` pero **NO** `iss` ni `email_verified`. Validarlos manualmente es defense in depth.
- 401 vs 409: 401 = "credenciales inválidas", 409 = "estado del recurso no permite la operación". Para conflicto de `provider_id` Google, 409 es semánticamente correcto.
- Bug latente descubierto durante revisión: `if (tryInit()) return` en `useEffect` impedía que el cleanup (`getGis()?.id.cancel()`) se ejecutara en el caso común. El popup quedaba huérfano (zombie auth).
- `@react-oauth/google` queda instalada pero **no se usa activamente** en el código de aplicación. Pesa ~5 KB gzip, se usará en el futuro para refresh tokens.
- Índice único parcial `UNIQUE (provider, provider_id) WHERE provider_id IS NOT NULL` permite múltiples usuarios `local` con `provider_id=NULL` sin violar unicidad, garantizando al mismo tiempo que un `(provider, provider_id)` dado solo exista una vez.
- Subagente `qa-senior` tiene error de modelo persistente (`anthropic/claude-sonnet-4-6` con typo). Cuando falla, hacer la visión de QA condensada como Coordinador Técnico.

## Accomplished

- ✅ 3 historias creadas en GitHub issues #15, #16, #17 y vinculadas a project #2 "Backlog del proyecto"
- ✅ Senior-dev implementó las 3 historias (157 + 49 = 206 tests passing)
- ✅ Tech-lead revisó: **APROBADO CON CAMBIOS MENORES** (0 críticos, 5 importantes)
- ✅ Senior-dev aplicó los 5 fixes del tech-lead (206 tests passing, lint OK, build OK)
- ✅ 5 commits atómicos en rama `feature/google-oauth`:
  1. `chore: migrate from codegraphcontext to codebase-memory-mcp` (MCP no relacionado)
  2. `feat(api): add Google OAuth provider infrastructure (#15)` — 6 archivos
  3. `feat(api): add POST /auth/google endpoint (#16)` — 12 archivos
  4. `feat(web): add "Continue with Google" button (#17)` — 10 archivos
  5. `docs: update documentation for Google OAuth implementation` — este commit
- ✅ ADR-006 añadido a `memory-bank/decisions.md`
- ✅ `docs/tasks/google-oauth-cloud-setup.md` creado (guía paso a paso)
- ✅ Patrón de Google OAuth añadido a `memory-bank/patterns.md` (sección 9.4)
- ✅ `project-context.md` actualizado (fase actual + Google OAuth en lista de features)
- ✅ `backlog.md` actualizado (T-014a/b/c en Completadas)
- ✅ Visión de QA condensada (6 dimensiones) generada por Coordinador Técnico como fallback al subagente `qa-senior` con error de modelo

## Next Steps

- **Para el usuario:**
  - Configurar Google Cloud Console siguiendo `docs/tasks/google-oauth-cloud-setup.md`
  - Añadir `GOOGLE_CLIENT_ID` a `apps/api/.env` y `VITE_GOOGLE_CLIENT_ID` a `apps/web/.env.local`
  - Probar localmente con `docker compose up -d` y haciendo click en el botón
  - Cuando esté listo: mergear rama `feature/google-oauth` a `main` (o abrir PR si prefiere)
  - (Opcional) Implementar tests E2E con Playwright siguiendo el test plan sugerido
  - (Opcional) Configurar logging estructurado de eventos OAuth (mejora de observabilidad sugerida por QA)
- **Para próximas sesiones:**
  - T-015 (recuperación de contraseña) — siguiente tarea del backlog
  - Considerar añadir más proveedores OAuth (GitHub, Apple) replicando el patrón de `google_auth.py`
  - Considerar migrar de `codegraphcontext` a `codebase-memory-mcp` (ya hecho en este commit)

## Relevant Files

### Nuevos (creados en esta sesión)
- `apps/api/alembic/versions/2026_07_02_1641_a1b2c3d4e5f6_add_provider_and_provider_id_to_users.py` — migración Alembic (54 líneas)
- `apps/api/app/core/google_auth.py` — `verify_google_id_token` + `GoogleAuthError` (115 líneas)
- `apps/api/tests/services/test_auth_service_google.py` — 10 tests unitarios (248 líneas)
- `apps/api/tests/services/test_auth_service_login.py` — 6 tests (incluye OAuth+password)
- `apps/api/tests/routers/test_auth_google.py` — 6 tests de integración (195 líneas)
- `apps/api/tests/routers/__init__.py` — vacío, requerido por pytest
- `apps/api/tests/test_rate_limit.py` — test del rate limit
- `apps/api/uv.lock` — lockfile Python
- `apps/web/src/components/shared/google-login-button.tsx` — botón con GSI directo (210 líneas)
- `apps/web/src/components/shared/google-login-button.test.tsx` — 10 tests (177 líneas)
- `docs/tasks/google-oauth-cloud-setup.md` — guía Google Cloud (172 líneas)
- `memory-bank/sessions/session-2026-07-02-google-oauth.md` — esta entrada

### Modificados
- `apps/api/app/models/user.py` — columnas `provider`, `provider_id`, índice único parcial
- `apps/api/app/core/config.py` — `google_client_id` setting
- `apps/api/app/repositories/user_repository.py` — `get_by_provider_and_id`, `create_oauth_user`
- `apps/api/app/routers/auth.py` — `POST /api/v1/auth/google`
- `apps/api/app/schemas/auth.py` — `GoogleLoginRequest`
- `apps/api/app/services/auth_service.py` — `login_or_register_with_google`
- `apps/api/tests/factories.py` — `make_user` con `provider` y `provider_id`
- `apps/api/requirements.txt` — `google-auth==2.41.1`
- `apps/api/.env.example` — `GOOGLE_CLIENT_ID=`
- `apps/web/package.json` — `@react-oauth/google@^0.13.5`
- `apps/web/src/App.tsx` — limpieza
- `apps/web/src/lib/env.ts` — `env.googleClientId`
- `apps/web/src/pages/login/login.page.tsx` — botón + separador "o"
- `apps/web/src/pages/register/register.page.tsx` — idem
- `apps/web/src/services/auth.service.ts` — `loginWithGoogle`
- `apps/web/.env.example` — `VITE_GOOGLE_CLIENT_ID=`
- `pnpm-lock.yaml` — lockfile pnpm
- `memory-bank/decisions.md` — ADR-006 (sección ~líneas 230-270)
- `memory-bank/project-context.md` — fase actualizada, Google OAuth en lista de features
- `memory-bank/patterns.md` — sección 9.4 (Google Identity Services directo)
- `docs/tasks/backlog.md` — T-014a/b/c en Completadas
- `AGENTS.md` — bloque de `codebase-memory-mcp` añadido
- `opencode.json` — `codegraphcontext` reemplazado por `codebase-memory-mcp`

## Métricas finales

- **Tests:** 157 backend + 49 frontend = **206 passing**
- **Lint:** ruff ✅, eslint ✅ (3 warnings preexistentes), tsc ✅
- **Build:** OK (569 kB JS / 27 kB CSS)
- **Commits:** 5 atómicos en `feature/google-oauth`
- **Archivos:** 31 modificados/creados (sin contar cambios no planificados)
- **Issues:** 3 cerrados (#15, #16, #17) — pendiente cerrar tras merge
