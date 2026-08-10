# Contexto del Proyecto — GlyphLog

> Documento de referencia rápida. Mantenerlo siempre actualizado al finalizar cada sesión de trabajo.
> Última actualización: agosto 2026

---

## 1. ¿Qué es GlyphLog?

GlyphLog es una aplicación web personal para registrar, organizar y hacer seguimiento del consumo de animes, mangas y videojuegos. Permite al usuario mantener una colección personal con estados de progreso, notas y métricas básicas de consumo. Es un proyecto de uso personal con objetivo formativo y de portfolio, construido con tecnologías modernas y buenas prácticas de ingeniería de software.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React | 18 |
| Frontend | Vite | última estable |
| Frontend | TypeScript | 5+ |
| Frontend | Tailwind CSS | 3+ |
| Frontend | shadcn/ui | última estable |
| Frontend | reicon-react | última estable (experimental) |
| Backend | FastAPI | última estable |
| Backend | Python | 3.11+ |
| Backend | SQLAlchemy | 2.x |
| Backend | Alembic | última estable |
| Backend | Pydantic | v2 |
| Base de datos | PostgreSQL | 15+ |
| Infraestructura local | Docker + Docker Compose | - |
| Monorepo | Turborepo | última estable |
| Gestión de paquetes | pnpm workspaces | 8+ |

---

## Fase actual

**Fase 0 — Setup completado, CRUD completo de entradas implementado, y Google OAuth integrado en login y registro** (julio 2026)

> **Agosto 2026 — Limpieza de código:** auditoría completa y limpieza de código muerto/basura git (6 commits, ver `memory-bank/sessions/session-2026-08-04-code-cleanup.md` y ADR-011).
>
> **Agosto 2026 — Fixes UX, import MAL y proveedor LLM:** tema sin blur, GlyphAI, DevTools solo dev, import de export real de MAL (`.xml.gz` por navegador), fix `auth.user_id` → `auth.id` (causa de 500) y abstracción `llm_client` por entorno (OpenAI local / Bedrock prod, ADR-014). Ver `memory-bank/sessions/session-2026-08-07-llm-provider-import-fixes.md`.

- `apps/web` scaffoldeado: Vite + React 18 + TypeScript strict + Tailwind CSS + shadcn/ui
- Sistema de auth con JWT en sessionStorage
- React Router v6 con rutas pública y protegidas
- TanStack Query v5 configurado
- Cliente Axios centralizado con interceptores
- Componentes shadcn/ui base instalados: Button, Input, Label, Card, Form, Toast, Dropdown, Avatar
- Build de producción verificado (441 kB, 0 errores TypeScript, 0 errores ESLint)
- `apps/api` scaffoldeado: FastAPI + estructura de carpetas (routers, services, repositories, schemas, models, core)
- Modelos SQLAlchemy definidos: User (UUID, email, hashed_password) y Entry (UUID, user_id, title, type, status, rating, year, notes, cover_image)
- `docker-compose.yml` creado: PostgreSQL 15 Alpine con healthcheck, volumen persistente y puerto restringido a 127.0.0.1
- Migraciones Alembic ejecutadas: tablas `users` y `entries` creadas; índice `ix_entries_created_at` añadido para optimizar listados
- Backend implementado:
  - `POST /api/v1/entries/` — crear entrada con validaciones y manejo de duplicados
  - `GET /api/v1/entries/` — listar entradas del usuario autenticado con filtro por tipo y paginación (15 ítems por página, ordenadas por `created_at DESC`)
  - `GET /api/v1/entries/{entry_id}` — consultar detalle de una entrada del usuario autenticado
  - `PUT /api/v1/entries/{entry_id}` — actualizar campos editables de una entrada (todos opcionales); permite limpiar `rating`, `year`, `notes` y `cover_image` enviando `null`; rechaza `null` en `type` y `status` con 422
  - `POST /api/v1/entries/{entry_id}/cover` — subir o cambiar la imagen de portada de una entrada propia; valida magic bytes, formato (JPG/PNG/WebP) y tamaño máximo de 5MB
  - `DELETE /api/v1/entries/{entry_id}` — eliminar una entrada del usuario autenticado
  - Respuesta paginada: `entries`, `total`, `page`, `limit`, `total_pages`
  - Tests de servicio e integración para listado, creación, consulta, edición, eliminación y subida de portada con mocks
  - Tests antiguos refactorizados para usar `tests/factories.py`
  - Mypy pasa sin errores en `app/`
- Frontend implementado:
  - Página `/collection` con estados de carga, vacío, error y éxito
  - Filtros por tipo (Todos, Anime, Manga, Juego) y paginación
  - Componentes `EntryCard`, `EntryFilters`, `EntryPagination`
  - Hook `useEntries` con TanStack Query y `useCreateEntry` con invalidación automática
  - Tipos OpenAPI regenerados (`EntryResponse`, `EntryUpdate`, `PaginatedEntryResponse`, `EntryListItem`)
  - Servicios `getEntry`, `updateEntry`, `deleteEntry` y `uploadCoverImage` en `entry.service.ts`
  - Hooks `useEntry`, `useUpdateEntry`, `useDeleteEntry` con invalidación de queries
  - Página `/entries/:id` con modo lectura, modo edición, cambio/eliminación de imagen de portada y diálogo de confirmación para eliminar
  - Navegación desde `EntryCard` al detalle mediante `Link`
  - Componentes de formulario compartidos extraídos a `components/shared/entry-form/`
  - Utilidad `getApiErrorMessage` para parsear errores 422 tanto en string como en array de validación
  - Tests para `useEntries`, `useEntry`, `useUpdateEntry`, `useDeleteEntry`, `EntryCard` y `EntryDetailPage`
- Auth con Google OAuth implementada (issues #15, #16, #17):
  - Columnas `provider` y `provider_id` en `users` con índice único parcial (migración Alembic)
  - `POST /api/v1/auth/google` con verificación de `id_token` JWT (librería oficial `google-auth`)
  - Validación de `iss`, `aud` y `email_verified` (defense in depth)
  - NO auto-vinculación de cuentas locales con Google (devuelve 409 con instrucciones)
  - 503 graceful cuando `GOOGLE_CLIENT_ID` no está configurado
  - Botón "Continuar con Google" en `/login` y `/register` con Google Identity Services directo
  - Documentación de setup en `docs/tasks/google-oauth-cloud-setup.md`
  - Decisiones documentadas en ADR-006 (`memory-bank/decisions.md`)
  - Refactoring y limpieza general completada:
    - Eliminados archivos temporales/caché (`tsconfig.*.tsbuildinfo`) y carpetas `uploads/` duplicadas en la raíz y en `apps/web/`.
    - Descompuesto el componente pesado `entry-detail.page.tsx` (~380 líneas) en subcomponentes atómicos (`EntryDetailView`, `EntryEditForm`, `EntryDetailSkeleton`).
    - Creado componente compartido `ErrorState` en `components/shared/` para unificar renders de error.
    - Extraído modal simulado de recuperación de contraseña a `forgot-password-modal.tsx`.
    - Renombrados hooks a camelCase (`useAuth`, `useCreateEntry`) para seguir convenciones.
    - Creado validador centralizado `normalize_email` en backend y limpiadas conversiones de tipos en el router `entries.py` usando `EntryCreateForm`.
    - Corregida documentación de arquitectura y README del proyecto con datos exactos y vigentes.
  - Tests: 157 backend + 43 frontend = **200 passing**
  - Lint: ruff ✅, eslint ✅, tsc ✅, build ✅

**Fase 1 — Búsqueda, ordenamiento e integración de catálogos externos completada** (julio 2026)

**Despliegue de Batch de Fixes y Mejoras** (13 de Julio de 2026)
- **Fuga de datos (P0)**: Corregido el leak de caché de TanStack Query limpiando la caché en el logout y mediante el interceptor 401.
- **OAuth local (P1)**: Configurado Google OAuth en Compose local.
- **Dropdown modo oscuro (P2)**: Arreglada la visibilidad de resultados del catálogo en dark mode utilizando variables CSS de opacidad centralizadas.
- **Recortador de portadas (P3)**: Integrado `react-easy-crop` para zoom y arrastre de portadas locales.
- **Producción**: Todo compilado, probado y desplegado con éxito en Oracle Cloud VM + Cloudflare (HTTPS) con healthchecks exitosos.

- Búsqueda y ordenamiento en colección propia (Track A):
  - Modificado el endpoint del backend (`GET /api/v1/entries/`) para soportar los parámetros query `search`, `sort_by` y `sort_order`.
  - Aplicada búsqueda case-insensitive con `ILIKE` en `EntryRepository`, y ordenamiento dinámico con cláusula `.nulls_last()` en ratings nulos.
  - Desarrollados los hooks frontend `useDebounce` y `useSearchEntries`.
  - Diseñada la barra de búsqueda global `SearchBar` en el header con dropdown rápido, estados de carga y navegación.
  - Creado el selector de orden `EntrySortSelector` en `/collection` y sincronizado el estado completo con la URL (`useSearchParams`).
- Catálogos externos y autocompletado (Track B):
  - Integrada la API de Jikan (animes/mangas) y RAWG (videojuegos, con key `RAWG_API_KEY`) concurrentemente con `asyncio.gather(return_exceptions=True)`.
  - Diseñada una caché en memoria (`MemoryCache`) con un TTL de 5 minutos para rate limits.
  - Expuesto el endpoint JWT `/api/v1/external/search?q=`.
  - Creado el componente frontend `ExternalSearchAutocomplete` para rellenar automáticamente campos y la portada remota (`cover_image_url`), con opción a desvincular para edición manual.
- Calidad:
  - Tests totales: 167 backend + 43 frontend = **210 passing**
  - Tipos OpenAPI regenerados y tipado estricto al 100%.
- Theme Toggle Premium (historias #23 y #24):
  - Integrada la **View Transitions API** nativa en el cambio de tema, permitiendo una animación circular con desenfoque (blur) desde el botón al cambiar.
  - Implementado fallback gracioso para navegadores que no soportan la API nativa de transición.
  - Integrada la dependencia `reicon-react` de forma aislada, utilizando sus iconos `Sun` y `Moon` en `ThemeToggle` para evaluar la biblioteca.
- Perfil de usuario (historia #31):
  - Añadidas columnas `username`, `avatar_filename` y `bio` al modelo `User` con migración Alembic e índice único case-insensitive (`LOWER(username)`).
  - Nuevos endpoints `/api/v1/users/me`: GET, PATCH, POST avatar y DELETE avatar.
  - Avatar subido validado por magic bytes, tamaño máx 2MB y convertido a WebP con Pillow; guardado como `{user_id}.webp` en `/uploads/avatars/`.
  - Avatar generado por DiceBear (`pixel-art` style, seed=UUID) como fallback.
  - Frontend: página `/profile`, componente `ProfileAvatar`, hooks `useProfile`, `useUpdateProfile`, `useUploadAvatar`, `useDeleteAvatar`.
  - Header actualizado con dropdown de perfil: "Mi perfil" y "Cerrar sesión".
  - Tests: 197 backend + 62 frontend = **259 passing**
  - Lint: ruff ✅, eslint ✅, tsc ✅, build ✅

- Seguimiento de progreso (historias #32 y #33):
  - Backend: modelo `ProgressEvent` con tabla inmutable `progress_events`, enums `ProgressUnit` y `ProgressEventType`.
  - Campos `progress_unit`, `progress_total` y `current_progress` en `Entry` con validaciones de BD.
  - Migración Alembic `2026_07_17_0841_c2d0c6a36954_add_progress_tracking`.
  - Endpoint `POST /api/v1/entries/{entry_id}/progress/reset` para reiniciar progreso con transacción y `SELECT FOR UPDATE`.
  - Endpoint `POST /api/v1/entries/{entry_id}/progress` para actualizar progreso manual creando un `ProgressEvent` de tipo `update` en la misma transacción (`SELECT FOR UPDATE`).
  - Bloqueo de cambios incompatibles de tipo/unidad cuando existe historial (409 Conflict).
  - Campo calculado `has_history` en `EntryResponse` para facilitar el frontend.
  - Frontend: componente `ProgressConfigSelector` integrado en formularios de creación y edición.
  - Hook `useResetProgress`, servicio `resetProgress` y modal `ResetProgressModal` para reiniciar progreso.
  - Hook `useUpdateProgress`, servicio `updateProgress` y modal interactivo `UpdateProgressModal` para actualizar progreso (con ajuste +/- rápido, nota y prompt inteligente para marcar completada la entrada).
  - Sección de progreso en `EntryDetailView` integrada con botón de actualización manual.
  - Tests: 233 backend + 66 frontend = **299 passing**
  - Lint: ruff ✅, eslint ✅, tsc ✅, build ✅

- Unidades de progreso fijas por tipo (issue #37):
  - Backend: unidad única derivada del tipo (`anime` → `episodes`, `manga` → `chapters`, `game` → `hours`).
  - Schemas `EntryCreate` y `EntryUpdate` eliminan `progress_unit`; `EntryResponse` lo mantiene para compatibilidad.
  - `current_progress`, `progress_total` y valores de `ProgressEvent` migran a `Numeric(10,2)`.
  - Anime y manga: solo enteros; juegos: decimales con step 0.25 y quick-add `+0.5 h`.
  - Migración Alembic `2026_07_19_1205_3da18b312194_fix_progress_units_to_single_unit_per_type`: convierte `minutes` → `hours` y crea eventos `reset` para entradas legacy con historial.
  - Frontend: `ProgressConfigSelector` ahora muestra un label fijo en lugar de un selector; formularios no envían `progress_unit`.
  - `UpdateProgressModal` adapta step y labels según el tipo de entrada.
  - Tests: 250 backend + 66 frontend = **316 passing**
  - Lint: ruff ✅, eslint ✅, tsc ✅, build ✅
  - ADR: `memory-bank/decisions.md` → ADR-009.

- GlyphLog Companion — Extensión de Chrome y tokens de dispositivo (historia #36):
  - Backend: modelo `DeviceToken` con hashes SHA-256, expiración rolling a los 90 días y revocación manual.
  - Códigos de emparejamiento efímeros (6 caracteres, TTL 5 minutos, de un solo uso).
  - Autenticación flexible en `security.py` (`get_current_user_flexible`): acepta JWT o Device Token (prefijo `dt_`).
  - Audibilidad: el origen de los eventos de progreso distingue `source="browser_extension"` vs `source="web"`.
  - Extensión Chrome MV3 (`apps/extension`): popup vanilla JS con búsqueda con debounce, actualización de progreso con botones +/- rápidos y almacenamiento en `chrome.storage.local`. Permisos mínimos (`storage`, `host_permissions` de API, sin `<all_urls>`).
  - Frontend SPA (`apps/web`): sección **Dispositivos** en `/profile` con el componente `DeviceManager`, generación de código con temporizador de 5 min y diálogo de revocación.
  - Tests: 242 backend + 103 frontend = **345 passing**
  - Build & Lint: tsc ✅, eslint ✅, build ✅

- Precargar `progress_total` desde APIs externas (historia #38):
  - Backend:
    - Schema `ExternalSearchResult` añade `progress_total: Decimal | None` y `slug: str | None`.
    - Cliente AniList: GraphQL pide `episodes` (anime) y `chapters` (manga) y mapea a `progress_total`.
    - Cliente RAWG: el listado ahora expone `slug`; nuevo método `get_game_detail` para obtener `playtime` del endpoint `/games/{slug}`.
    - Nuevo endpoint `GET /api/v1/external/games/{slug}` que devuelve `GameDetailResponse` con caché de 5 minutos.
    - Degradación elegante: si RAWG no está configurado o el juego no existe, devuelve `playtime_hours=None`.
  - Frontend:
    - Regenerados tipos OpenAPI (`GameDetailResponse`, campo `progress_total` en `ExternalSearchResult`).
    - Nuevo servicio `getGameDetail` y hook `useGetGameDetail`.
    - `ExternalSearchAutocomplete`: autocompleta `progress_total` directamente para anime/manga desde AniList; para juegos lanza lazy fetch a RAWG al seleccionar.
    - `ProgressConfigSelector`: botón "＋ Total" (popover) solo para anime/manga; badge de origen (`AniList` / `RAWG` / `Manual`) bajo el input.
    - Estado del origen (`ProgressTotalSource`) manejado en `CreateEntryPage` y propagado a los componentes.
  - Tests: 264 backend + 122 frontend = **386 passing**
  - Lint: ruff ✅ (app/), eslint ✅, tsc ✅, build ✅

---

## Fase anterior

**Fase 0: Setup del monorepo** — junio 2025

Estado: en curso. Se está configurando la estructura base del monorepo, el entorno de desarrollo local con Docker y el scaffolding inicial de frontend y backend.

### Progreso de la fase

- [x] Estructura de carpetas del monorepo definida
- [x] `turbo.json` y `pnpm-workspace.yaml` configurados
- [x] Memory Bank inicializado
- [x] Documentación de MCPs creada
- [x] Scaffold de `apps/web` (React + Vite + TS + Tailwind + shadcn/ui)
- [x] Scaffold de `apps/api` (FastAPI + estructura de carpetas)
- [x] `docker-compose.yml` funcional con PostgreSQL
- [x] Primera migración de Alembic (tablas users y entries)
- [ ] Health check de API funcionando

---

## 4. Estructura del monorepo

```
GlyphLog/
├── apps/
│   ├── web/               # Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
│   └── api/               # Backend: FastAPI + SQLAlchemy + Alembic
├── docs/
│   ├── architecture/      # Diagramas y documentación de arquitectura técnica
│   ├── mcps/              # Documentación de MCPs (Playwright, PostgreSQL, Filesystem, Git)
│   ├── tasks/             # Tareas del backlog y documentación de features
│   ├── SETUP.md           # Decisiones originales del proyecto
│   └── README.md          # Índice de la documentación
├── memory-bank/           # Contexto persistente para agentes IA (este directorio)
├── AGENTS.md              # Guía de trabajo para agentes IA
├── README.md              # Documentación principal del proyecto
├── turbo.json             # Configuración de Turborepo
├── pnpm-workspace.yaml    # Configuración de workspaces de pnpm
└── package.json           # Root package.json
```

### Estructura interna de `apps/web`

```
apps/web/src/
├── components/
│   ├── ui/                # Componentes base de shadcn/ui (no modificar directamente)
│   └── shared/            # Componentes del dominio de GlyphLog
├── pages/                 # Vistas/páginas (una por ruta)
├── hooks/                 # Custom hooks
├── services/              # Llamadas a la API
├── types/                 # Interfaces y tipos TypeScript
├── utils/                 # Funciones de utilidad puras
└── lib/                   # Configuración de librerías externas
```

### Estructura interna de `apps/api`

```
apps/api/app/
├── routers/               # Endpoints agrupados por recurso
├── services/              # Lógica de negocio
├── repositories/          # Queries a la base de datos
├── schemas/               # Pydantic models (request/response)
├── models/                # SQLAlchemy models
├── core/                  # Config, seguridad, sesión de BD
└── main.py                # Entry point de la aplicación
```

---

## 5. MVP — Qué debe hacer la app

El MVP de GlyphLog cubre las siguientes funcionalidades mínimas:

### Autenticación
- Registro de usuario con email y contraseña
- Login con email y contraseña
- Logout
- Sesión persistente (JWT o similar)

### Gestión de colección (CRUD de entradas)
- Crear una entrada con título, tipo (anime / manga / videojuego) y estado
- Ver la lista de entradas de la colección personal
- Editar una entrada existente
- Eliminar una entrada

### Estados de seguimiento disponibles
- `watching` / `reading` / `playing` — en progreso
- `completed` — completado
- `on_hold` — pausado
- `dropped` — abandonado
- `plan_to_watch` — pendiente

### Fuera del MVP (post-MVP)
- Progreso detallado por tipo (episodios, capítulos, horas jugadas)
- Imágenes de portada
- Tags y categorías personalizadas
- Estadísticas de consumo
- Login social (Google, etc.)

---

## 6. Decisiones clave ya tomadas

| Decisión | Elección | ADR |
|----------|---------|-----|
| Tipo de aplicación frontend | SPA (Single Page Application) con React + Vite | ADR-001 |
| Gestor de monorepo | Turborepo con pnpm workspaces | ADR-002 |
| Sistema de componentes UI | shadcn/ui | ADR-003 |
| Framework backend | FastAPI (Python) | — |
| ORM | SQLAlchemy 2.x con Alembic para migraciones | — |
| Base de datos | PostgreSQL (Oracle Cloud en producción) | — |
| Validación de datos | Pydantic v2 | — |

Detalles completos en `memory-bank/decisions.md`.

---

## 7. Lo que todavía NO está decidido

Estas decisiones están pendientes y deben documentarse en `decisions.md` cuando se tomen:

- **Sistema de autenticación concreto:** JWT implementado manualmente vs. librería (python-jose, authlib). Cuándo expiran los tokens. Refresh tokens o no. *(Resuelto: ver ADR-005. Login con JWT manual con PyJWT, tokens expiran en 60 min.)*
- **Login social:** ~~si se implementará Google OAuth u otros proveedores en el MVP o se deja para post-MVP.~~ *(Resuelto: Google OAuth implementado, ver ADR-006. Otros proveedores pendientes.)*
- **Estrategia de recuperación de contraseña:** email con enlace, código OTP, o simplemente no en MVP.
- **Modelado del progreso por tipo de contenido:** ~~si episodios/capítulos/horas se modelan en la tabla principal o en tablas separadas.~~ *(Resuelto: unidades fijas en campos de `Entry` con tabla `progress_events` para historial; ver ADR-008 y ADR-009.)*
- **Hosting del frontend:** Netlify, Vercel, GitHub Pages u otra opción.
- **Estrategia de testing E2E:** si se usan datos de test reales en BD o se mockea la API.

---

## 8. Links útiles

| Recurso | Ruta | Para qué |
|---------|------|---------|
| Guía de inicio rápido | `README.md` | Documentación principal del proyecto |
| Setup detallado | `docs/SETUP.md` | Decisiones originales y configuración del entorno |
| Guía para agentes | `AGENTS.md` | Convenciones, flujo de trabajo y principios |
| Arquitectura técnica | `docs/architecture/` | Diagramas y decisiones de arquitectura |
| Backlog de tareas | `docs/tasks/backlog.md` | Tareas pendientes y en progreso |
| Documentación MCPs | `docs/mcps/` | Cómo usar los MCPs disponibles |
| Decisiones ADR | `memory-bank/decisions.md` | Por qué se eligió cada cosa |
| Patrones de código | `memory-bank/patterns.md` | Cómo escribir código en este proyecto |
