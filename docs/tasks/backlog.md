# Backlog — GlyphLog

Estado actualizado del backlog del proyecto. Las tareas se ordenan por prioridad dentro de cada sección.

---

## Completadas

| ID | Tipo | Título | Prioridad | Estado | Dependencias |
|---|---|---|---|---|---|
| T-001 | SETUP | Definir base del proyecto y escribir SETUP.md | alta | completada | ninguna |
| T-002 | SETUP | Setup inicial del monorepo (Turborepo + pnpm + estructura de carpetas + docs) | alta | completada | T-001 |
| T-003 | SETUP | Scaffold frontend (React + Vite + TypeScript + Tailwind CSS + shadcn/ui) | alta | completada | T-002 |
| T-004 | SETUP | Scaffold backend (FastAPI + estructura de carpetas + uvicorn) | alta | completada | T-002 |
| T-005 | SETUP | Docker Compose (PostgreSQL + servicios de infraestructura) | alta | completada | T-002 |
| T-006 | FEAT | Modelo User + migración inicial (Alembic) | alta | completada | T-004, T-005 |
| T-007 | FEAT | Modelo Entry + migración | alta | completada | T-006 |

---

## En progreso

*Sin tareas en progreso.*

---

## Próximas — Alta prioridad

| ID | Tipo | Título | Prioridad | Estado | Dependencias |
|---|---|---|---|---|---|
| T-008 | FEAT | HU: Registro de usuario (endpoint + frontend) | alta | backlog | T-006 |
| T-009 | FEAT | HU: Login de usuario (JWT + frontend) | alta | backlog | T-008 |
| T-010 | FEAT | HU: Crear entrada | alta | backlog | T-007, T-009 |
| T-011 | FEAT | HU: Listar colección | alta | backlog | T-010 |
| T-012 | FEAT | HU: Editar entrada | alta | backlog | T-010 |
| T-013 | FEAT | HU: Eliminar entrada | alta | backlog | T-010 |

---

## Backlog — Prioridad media

| ID | Tipo | Título | Prioridad | Estado | Dependencias |
|---|---|---|---|---|---|
| T-014 | FEAT | Login social (Google OAuth) | media | backlog | T-009 |
| T-015 | FEAT | Recuperación de contraseña por email | media | backlog | T-008 |
| T-016 | FEAT | Campo de progreso en entradas (episodio actual, capítulo, horas) | media | backlog | T-010 |

---

## Backlog — Prioridad baja / futuro

| ID | Tipo | Título | Prioridad | Estado | Dependencias |
|---|---|---|---|---|---|
| T-017 | FEAT | Rating, tags y notas en entradas | baja | backlog | T-010 |
| T-018 | FEAT | Filtros y búsqueda en la colección | baja | backlog | T-011 |
| T-019 | FEAT | Estadísticas de colección (dashboard con métricas) | baja | backlog | T-011 |
