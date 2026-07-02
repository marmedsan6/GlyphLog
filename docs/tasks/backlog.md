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
| T-008 | FEAT | HU: Registro de usuario (endpoint + frontend) | alta | completada | T-006 |
| T-009 | FEAT | HU: Login de usuario (JWT + frontend) | alta | completada | T-008 |
| T-010a | FEAT | HU: Crear entrada básica + validación de duplicados | alta | completada | T-007, T-009 |
| T-010b | FEAT | HU: Campos opcionales (rating, año, notas, imagen subida) | alta | completada | T-010a |
| T-011 | FEAT | HU: Listar colección | alta | completada | T-010a |
| T-012 | FEAT | HU: Editar entrada | alta | completada | T-010a |
| T-013 | FEAT | HU: Eliminar entrada | alta | completada | T-010a |
| T-014a | FEAT | Google OAuth: infraestructura (Issue #15) | alta | completada | T-009 |
| T-014b | FEAT | Google OAuth: endpoint backend POST /auth/google (Issue #16) | alta | completada | T-014a |
| T-014c | FEAT | Google OAuth: botón frontend "Continuar con Google" (Issue #17) | alta | completada | T-014b |

---

## En progreso

*Sin tareas en progreso.*

---

## Próximas — Alta prioridad

| ID | Tipo | Título | Prioridad | Estado | Dependencias |
|---|---|---|---|---|---|

---

## Backlog — Prioridad media

| ID | Tipo | Título | Prioridad | Estado | Dependencias |
|---|---|---|---|---|---|
| T-015 | FEAT | Recuperación de contraseña por email | media | backlog | T-008 |
| T-016 | FEAT | Campo de progreso en entradas (episodio actual, capítulo, horas) | media | backlog | T-010a |

---

## Backlog — Prioridad baja / futuro

| ID | Tipo | Título | Prioridad | Estado | Dependencias |
|---|---|---|---|---|---|
| T-017 | FEAT | Tags y categorías en entradas | baja | backlog | T-010a |
| T-018 | FEAT | Filtros y búsqueda en la colección | baja | backlog | T-011 |
| T-019 | FEAT | Estadísticas de colección (dashboard con métricas) | baja | backlog | T-011 |
