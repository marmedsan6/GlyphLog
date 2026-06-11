# Contexto del Proyecto — GlyphLog

> Documento de referencia rápida. Mantenerlo siempre actualizado al finalizar cada sesión de trabajo.
> Última actualización: junio 2025

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

**Fase 0 — Setup completado hasta migraciones iniciales** (junio 2025)

- `apps/web` scaffoldeado: Vite + React 18 + TypeScript strict + Tailwind CSS + shadcn/ui
- Sistema de auth con JWT en sessionStorage
- React Router v6 con rutas pública y protegidas
- TanStack Query v5 configurado
- Cliente Axios centralizado con interceptores
- Componentes shadcn/ui base instalados: Button, Input, Label, Card, Form, Toast, Dropdown, Avatar
- Build de producción verificado (241 kB, 0 errores TypeScript, 0 errores ESLint)
- `apps/api` scaffoldeado: FastAPI + estructura de carpetas (routers, services, repositories, schemas, models, core)
- Modelos SQLAlchemy definidos: User (UUID, email, hashed_password) y Entry (UUID, user_id, title, type, status)
- `docker-compose.yml` creado: PostgreSQL 15 Alpine con healthcheck, volumen persistente y puerto restringido a 127.0.0.1
- Primera migración Alembic ejecutada: tablas `users` y `entries` creadas en PostgreSQL con índices y constraints

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
├── packages/              # Paquetes compartidos (tipos, utils — pendiente de definir)
├── docker/                # Dockerfiles y configuración de Docker
├── docs/
│   ├── architecture/      # Diagramas y documentación de arquitectura técnica
│   ├── mcps/              # Documentación de MCPs (Playwright, PostgreSQL, Filesystem, Git)
│   ├── tasks/             # Tareas del backlog y documentación de features
│   └── README.md          # Índice de la documentación
├── memory-bank/           # Contexto persistente para agentes IA (este directorio)
├── AGENTS.md              # Guía de trabajo para agentes IA
├── SETUP.md               # Decisiones originales del proyecto
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

- **Sistema de autenticación concreto:** JWT implementado manualmente vs. librería (python-jose, authlib). Cuándo expiran los tokens. Refresh tokens o no.
- **Login social:** si se implementará Google OAuth u otros proveedores en el MVP o se deja para post-MVP.
- **Estrategia de recuperación de contraseña:** email con enlace, código OTP, o simplemente no en MVP.
- **Modelado del progreso por tipo de contenido:** si episodios/capítulos/horas se modelan en la tabla principal o en tablas separadas.
- **Hosting del frontend:** Netlify, Vercel, GitHub Pages u otra opción.
- **Estrategia de testing E2E:** si se usan datos de test reales en BD o se mockea la API.

---

## 8. Links útiles

| Recurso | Ruta | Para qué |
|---------|------|---------|
| Guía de inicio rápido | `README.md` | Documentación principal del proyecto |
| Setup detallado | `SETUP.md` | Decisiones originales y configuración del entorno |
| Guía para agentes | `AGENTS.md` | Convenciones, flujo de trabajo y principios |
| Arquitectura técnica | `docs/architecture/` | Diagramas y decisiones de arquitectura |
| Backlog de tareas | `docs/tasks/backlog.md` | Tareas pendientes y en progreso |
| Documentación MCPs | `docs/mcps/` | Cómo usar los MCPs disponibles |
| Decisiones ADR | `memory-bank/decisions.md` | Por qué se eligió cada cosa |
| Patrones de código | `memory-bank/patterns.md` | Cómo escribir código en este proyecto |
