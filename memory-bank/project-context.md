# Contexto del Proyecto — GlyphLog

> Documento de referencia rápida. Mantenerlo siempre actualizado al finalizar cada sesión de trabajo.
> Última actualización: julio 2026

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
- **Modelado del progreso por tipo de contenido:** si episodios/capítulos/horas se modelan en la tabla principal o en tablas separadas.
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
