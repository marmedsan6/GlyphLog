# AGENTS.md — Guía para Asistentes de IA

> **Lee este archivo antes de comenzar cualquier tarea en GlyphLog.**
> Es la fuente de verdad para agentes IA que trabajen en este proyecto. Contiene las convenciones, arquitectura, flujos de trabajo y contexto necesarios para operar correctamente.

<!-- codebase-memory-mcp:start -->

# Codebase Knowledge Graph (codebase-memory-mcp)

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
ALWAYS prefer MCP graph tools over grep/glob/file-search for code discovery.

## Priority Order

1. `search_graph` — find functions, classes, routes, variables by pattern
2. `trace_path` — trace who calls a function or what it calls
3. `get_code_snippet` — read specific function/class source code
4. `query_graph` — run Cypher queries for complex patterns
5. `get_architecture` — high-level project summary

## When to fall back to grep/glob

- Searching for string literals, error messages, config values
- Searching non-code files (Dockerfiles, shell scripts, configs)
- When MCP tools return insufficient results

## Examples

- Find a handler: `search_graph(name_pattern=".*OrderHandler.*")`
- Who calls it: `trace_path(function_name="OrderHandler", direction="inbound")`
- Read source: `get_code_snippet(qualified_name="pkg/orders.OrderHandler")`
<!-- codebase-memory-mcp:end -->

---

## 1. Propósito del documento

Este archivo centraliza todo lo que un agente de IA necesita saber para trabajar en GlyphLog de forma coherente, predecible y sin romper convenciones establecidas. Antes de crear, modificar o eliminar cualquier archivo, consulta las secciones relevantes de este documento.

Si algo no está cubierto aquí, consulta el `memory-bank/` o pregunta antes de asumir.

---

## 2. Resumen del proyecto

**GlyphLog** es una aplicación web personal para registrar, organizar y seguir el progreso de animes, mangas y videojuegos. Permite al usuario mantener una colección personal con estados de seguimiento, notas y métricas de consumo.

Es un proyecto **full-stack con objetivo formativo y de portfolio**, construido con tecnologías modernas y buenas prácticas de ingeniería de software.

### Stack principal

| Capa          | Tecnología                                                   |
| ------------- | ------------------------------------------------------------ |
| Frontend      | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui      |
| Backend       | FastAPI + Python 3.11+ + Pydantic + SQLAlchemy + Alembic     |
| Base de datos | PostgreSQL                                                   |
| Infra local   | Docker + Docker Compose                                      |
| Monorepo      | Turborepo + pnpm workspaces                                  |
| IA tools      | MCPs (Playwright, PostgreSQL, Filesystem, Git) + Memory Bank |

### Fase actual

**Setup** — Configuración inicial del monorepo, estructura de carpetas, infraestructura Docker y scaffolding base.

### Referencias

- [`README.md`](./README.md) — Descripción general y guía de inicio rápido
- [`docs/SETUP.md`](./docs/SETUP.md) — Instrucciones detalladas de configuración del entorno

---

## 3. Principios de trabajo

Estos principios son no negociables. Aplicarlos en cada tarea, sin excepciones.

- **Claridad sobre complejidad.** Si hay dos soluciones, elegir la más legible y mantenible, aunque sea menos "elegante".
- **Sin sobreingeniería.** No abstraer ni generalizar antes de tiempo. Resolver el problema concreto que existe hoy.
- **Cambios pequeños e incrementales.** Preferir commits atómicos y tareas acotadas. Evitar PRs que toquen demasiadas cosas a la vez.
- **No tocar código no relacionado.** Si estás arreglando un bug en el router de entradas, no refactorices el sistema de autenticación de paso.
- **Verificar criterios de aceptación.** Una tarea no está terminada hasta que todos los criterios de aceptación definidos en su descripción se cumplen. Verificarlos explícitamente.
- **Documentar decisiones relevantes.** Cualquier decisión de arquitectura, elección de librería o tradeoff significativo debe quedar registrado en `memory-bank/decisions.md`.

---

## 4. Reglas de codificación

### General

- No añadir comentarios que solo repiten lo que hace el código (`// incrementa el contador` sobre `count++`).
- Sí añadir comentarios cuando explican el **por qué**, no el qué (`// usamos debounce aquí porque la API tiene rate limiting`).
- Preferir claridad sobre brevedad. Un nombre de variable más largo pero descriptivo es mejor que una abreviatura críptica.
- Los errores deben siempre tener mensajes descriptivos que indiquen qué falló y, si es posible, por qué.

### TypeScript / React

- Usar **funciones puras** cuando sea posible; evitar efectos secundarios fuera de hooks o servicios.
- Componentes **pequeños y con responsabilidad única**. Si un componente hace demasiadas cosas, dividirlo.
- **Tipar siempre.** Evitar `any`. Si el tipo no se conoce, usar `unknown` y narrowing explícito.
- Preferir `const` sobre `let`. Nunca usar `var`.
- Usar **`async/await`** en lugar de cadenas `.then()`.
- **Named exports** para componentes (`export function EntryCard` en lugar de `export default`).

```typescript
// ✅ Correcto
export function EntryCard({ entry }: EntryCardProps) {
  const status = getStatusLabel(entry.status);
  return <div>{status}</div>;
}

// ❌ Evitar
export default ({ e }: any) => <div>{e.status}</div>;
```

### Python / FastAPI

- **Type hints en todas las funciones**, sin excepción.
- **Pydantic schemas** para toda entrada y salida de la API. No exponer modelos SQLAlchemy directamente.
- **Separar lógica de negocio de los routers.** Los routers delegan en servicios; los servicios delegan en repositorios.
- **Nunca lógica en los modelos de BD.** Los modelos SQLAlchemy son solo definición de esquema.
- Las excepciones HTTP deben tener mensajes claros que ayuden a diagnosticar el problema.

```python
# ✅ Correcto
@router.get("/{entry_id}", response_model=EntryResponse)
async def get_entry(entry_id: int, service: EntryService = Depends(get_entry_service)):
    entry = await service.get_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Entry with id {entry_id} not found")
    return entry

# ❌ Evitar
@router.get("/{entry_id}")
async def get_entry(entry_id, db=Depends(get_db)):
    return db.query(Entry).filter(Entry.id == entry_id).first()
```

---

## 5. Convenciones de nombres

| Artefacto                    | Convención                  | Ejemplo                |
| ---------------------------- | --------------------------- | ---------------------- |
| Archivos TS/TSX              | kebab-case                  | `entry-card.tsx`       |
| Componentes React            | PascalCase                  | `EntryCard`            |
| Hooks                        | camelCase con prefijo `use` | `useEntries`           |
| Funciones y variables TS     | camelCase                   | `getUserById`          |
| Constantes TS                | UPPER_SNAKE_CASE            | `MAX_ENTRIES`          |
| Archivos Python              | snake_case                  | `entry_router.py`      |
| Funciones y variables Python | snake_case                  | `get_user_by_id`       |
| Clases Python                | PascalCase                  | `EntryService`         |
| Rutas API                    | kebab-case                  | `/api/v1/user-entries` |
| Tablas de BD                 | snake_case plural           | `user_entries`         |
| Columnas de BD               | snake_case                  | `created_at`           |

---

## 6. Arquitectura del proyecto

### Frontend (`apps/web`)

```
src/
├── components/        # Componentes UI reutilizables
│   ├── ui/            # Componentes base (shadcn/ui — no modificar directamente)
│   └── shared/        # Componentes del dominio de GlyphLog
├── pages/             # Vistas/páginas (una por ruta)
├── hooks/             # Custom hooks (lógica reutilizable)
├── services/          # Llamadas a la API (fetch/axios)
├── types/             # Interfaces y tipos TypeScript
├── utils/             # Funciones de utilidad puras
└── lib/               # Configuración de librerías externas
```

### Backend (`apps/api`)

```
app/
├── routers/           # Endpoints agrupados por recurso
├── services/          # Lógica de negocio
├── repositories/      # Queries a la base de datos
├── schemas/           # Pydantic models (request/response)
├── models/            # SQLAlchemy models
├── core/              # Config, seguridad, sesión de BD
└── main.py            # Entry point
```

### Regla de flujo de dependencias

```
Router → Service → Repository → Base de datos
```

- Los **routers** solo validan la request, delegan al servicio y devuelven la response.
- Los **services** contienen la lógica de negocio. No hablan con la BD directamente.
- Los **repositories** son la única capa que ejecuta queries SQL/ORM.
- **Los routers nunca acceden a la BD directamente.**

---

## 6.5. Flujo SDD (Specification-Driven Development)

El proyecto sigue el flujo SDD: **spec → plan → tasks → código → tests → validación**. Cada fase se aprueba antes de pasar a la siguiente; la especificación formal es el contrato revisable que antecede al plan.

### Niveles de especificación (Tiers)

| Tier | Cuándo                                                             | Artefacto                                                     |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1    | Fix trivial (< 10 min): typo, bug puntual                          | Sin spec, directo al código                                   |
| 2    | Feature pequeña: un endpoint, un componente                        | Sección `## Especificación` compacta inline en el task doc    |
| 3    | Feature grande: auth, importaciones, descubrimiento, integraciones | Spec propia en `docs/specs/SPEC-<slug>.md` + gate de revisión |

### Reglas del flujo

1. **La spec se escribe y aprueba antes de desglosar en tareas.** Para Tier 3, la spec vive en `docs/specs/` (plantilla `TEMPLATE-SPEC.md`); para Tier 2, en la sección `## Especificación` del task doc.
2. **Gate de aprobación:** la spec se somete a revisión en plan mode (con los "Criterios de salida" de `TEMPLATE-SPEC.md`) antes de generar el task doc. Regla de oro: _la spec está lista cuando puedes escribir los tests solo leyéndola_.
3. **El task doc entra como salida del plan aprobado.** Se crea con `docs/tasks/TEMPLATE.md`, se añade a `docs/tasks/backlog.md` y se enlaza la spec en su sección Especificación.
4. **Trazabilidad:** spec → task doc → criterios de aceptación → código → tests. Cada criterio de aceptación traza a un requisito de la spec.
5. **Auditoría:** ejecuta el checklist de auditoría SDD de `docs/specs/README.md` periódicamente (fin de milestone o sesión significativa) para comprobar que el flujo se sigue estrictamente.

---

## 6.6. Routing orgánico de implementación

Antes de empezar cualquier tarea, elige la **ruta de implementación más pequeña que resuelva el resultado**. No trates el tamaño ni el número de archivos como una puntuación de riesgo ni como un umbral automático de SDD: son una señal de cuánto contexto necesitas.

| Ruta | Cuándo usarla | Qué haces |
| ---- | ------------- | --------- |
| **Directa inline** | Entender/decidir requiere **1–3 archivos**, o el cambio es **un archivo mecánico ya entendido** sin investigación ni decisión de diseño pendiente. | Ejecuta la acción acotada directamente, sin crear estado SDD. |
| **Directa delegada** | Entender requiere **4+ archivos**; leer prepara una escritura; hay investigación amplia; o un escritor toca **2+ archivos no triviales**. | Delega la exploración acotada y/o un único escritor con contexto fresco, sin crear artefactos SDD. |
| **SDD opcional** | El trabajo tiene ambigüedad sustancial, o los artefactos durables (propuesta, spec, design, tasks) reducirían materialmente la incertidumbre. | Ofrece SDD (sección 6.5). Selecciónalo **solo** tras una petición explícita del usuario o una propuesta aceptada. |

Reglas derivadas:

- **Regla de 4 archivos**: si para entender un flujo necesitas leer 4+ archivos, delega la exploración o lanza una fase de exploración.
- **Regla de escritura múltiple**: si vas a tocar 2+ archivos no triviales, usa un único escritor delegado o exige review fresca antes de terminar.
- **Regla de revisión pre-entrega**: antes de commit/push/PR tras cambios de código, ejecuta una revisión fresca salvo que el diff sea trivial (Tier 1).
- **Regla de incidente**: tras un `cwd` incorrecto, accidente de worktree/git, recuperación de merge, o workaround de entorno, ejecuta una auditoría fresca antes de continuar.
- **Regla de sesión larga**: tras ~20 tool calls, 5 lecturas exploratorias o 2 ediciones no mecánicas con complejidad creciente, pausa y delega, replanifica o justifica por qué no.

La delegación se aplica **por acción** (tests, builds, revisiones) sin cambiar la ruta de implementación ni crear un run SDD. Si un trabajo aparentemente simple revela ambigüedad sustancial, ofrece SDD en el siguiente límite seguro — nunca inscribas SDD en silencio.

---

## 7. Estructura de tareas

Todas las tareas deben seguir el template definido en `docs/tasks/TEMPLATE.md`. Úsalo al crear nuevas tareas o al documentar trabajo en curso. La sección `## Especificación` (antes de `## Tareas técnicas`) contiene el contrato de la tarea: enlace a la spec Tier 3 en `docs/specs/` o bloque compacto para Tier 2.

### Template

```markdown
# [TIPO] Título descriptivo de la tarea

## Contexto

¿Qué existe actualmente? ¿Qué antecede a esta tarea?

## Objetivo

¿Qué se quiere conseguir con esta tarea?

## Especificación

Contrato técnico: enlace a `docs/specs/SPEC-<slug>.md` (Tier 3) o bloque inline (Tier 2). N/A para Tier 1.

## Tareas técnicas

- [ ] Subtarea 1
- [ ] Subtarea 2

## Criterios de aceptación

- ✅ El usuario puede X
- ✅ La API devuelve Y
- ✅ Los tests pasan

## Notas técnicas

Decisiones, referencias, consideraciones a tener en cuenta.
```

### Tipos válidos

| Tipo         | Uso                                         |
| ------------ | ------------------------------------------- |
| `[FEAT]`     | Nueva funcionalidad                         |
| `[FIX]`      | Corrección de bug                           |
| `[REFACTOR]` | Mejora interna sin cambio de comportamiento |
| `[DOCS]`     | Documentación                               |
| `[SETUP]`    | Configuración de entorno o infraestructura  |
| `[TEST]`     | Añadir o corregir tests                     |
| `[CHORE]`    | Tareas de mantenimiento (deps, CI, etc.)    |

---

## 8. Comandos útiles del proyecto

### Turborepo

| Comando      | Descripción                          |
| ------------ | ------------------------------------ |
| `pnpm dev`   | Lanza frontend y backend en paralelo |
| `pnpm build` | Build de todos los workspaces        |
| `pnpm lint`  | Linting de todos los workspaces      |
| `pnpm test`  | Tests de todos los workspaces        |
| `pnpm clean` | Limpia builds y node_modules         |

### Docker

| Comando                      | Descripción                               |
| ---------------------------- | ----------------------------------------- |
| `docker compose up -d`       | Levanta todos los servicios en background |
| `docker compose down`        | Para y elimina los contenedores           |
| `docker compose logs -f api` | Sigue los logs del backend en tiempo real |
| `docker compose ps`          | Estado de los servicios                   |

### pnpm workspaces

| Comando                       | Descripción                    |
| ----------------------------- | ------------------------------ |
| `pnpm --filter web dev`       | Dev solo del frontend          |
| `pnpm --filter api dev`       | Dev solo del backend           |
| `pnpm --filter web add <pkg>` | Añadir dependencia al frontend |
| `pnpm --filter api add <pkg>` | Añadir dependencia al backend  |

---

### GitHub CLI (gh)

> ⚠️ **REQUISITO DE SEGURIDAD**: Nunca uses `gh` directamente. Siempre usa el wrapper `bash scripts/gh.sh`.

El wrapper **no contiene tokens hardcodeados**. Lee las credenciales del entorno:

- **Operaciones de repo** (push, issues, PRs, etc.) → usan `gh auth login` de la cuenta personal del usuario.
- **Operaciones de project** (`gh project ...`) → usan `GH_PROJECT_TOKEN` (env var) si está definida; si no, hace fallback a `gh` con el auth del usuario.

Configuración inicial (una sola vez):

```bash
gh auth login                                        # para operaciones de repo
gh auth login --scopes project,read:org              # si también gestionas project boards
# o bien, para mantener separación de privilegios:
export GH_PROJECT_TOKEN="ghp_xxx"                    # token classic con scopes project,read:org,read:discussion, en ~/.bashrc
```

El wrapper **bloquea explícitamente** cualquier comando que mencione `turing-challenge`.

| Comando                                                         | Descripción                  |
| --------------------------------------------------------------- | ---------------------------- |
| `bash scripts/gh.sh project list`                               | Listar proyectos             |
| `bash scripts/gh.sh project view <id>`                          | Ver detalle de proyecto      |
| `bash scripts/gh.sh project item-list <id>`                     | Listar items de un proyecto  |
| `bash scripts/gh.sh project view <id> --owner marmedsan6`       | Ver detalle de proyecto      |
| `bash scripts/gh.sh project item-list <id> --owner marmedsan6`  | Listar items de un proyecto  |
| `bash scripts/gh.sh project field-list <id> --owner marmedsan6` | Listar campos de un proyecto |
| `bash scripts/gh.sh ...`                                        | Cualquier comando gh         |

El proyecto **#2 "Backlog del proyecto"** (privado, `marmedsan6`) contiene las tareas y el backlog del desarrollo de GlyphLog. Es el tablero principal del proyecto. El proyecto **#1** es otro proyecto personal no relacionado.

Los tokens **no** viven en el repositorio. `scripts/gh.sh` está gitignored y solo lee `GH_PROJECT_TOKEN` del entorno. Si caduca, regenerar en GitHub y actualizar el `export` en `~/.bashrc`.

---

## 9. MCPs disponibles

Los MCPs (Model Context Protocol servers) amplían las capacidades del agente con acceso a herramientas externas. Documentación completa en `docs/mcps/`.

| MCP                     | Propósito                                 | Cuándo usarlo                                                                                          |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Codebase Memory MCP** | Grafo de conocimiento del código          | Indexar funciones, clases, rutas; trazar llamadas; detectar código muerto; analizar impacto de cambios |
| **Playwright**          | Testing E2E y automatización de navegador | Validar flujos de usuario complejos, comprobar que una feature funciona end-to-end                     |
| **PostgreSQL**          | Consultas directas a la base de datos     | Debuggear datos, verificar el resultado de migraciones, explorar el esquema actual                     |
| **Filesystem**          | Operaciones de archivos y directorios     | Refactors de estructura de carpetas, generación de scaffolds, mover o renombrar archivos               |
| **Git**                 | Análisis del repositorio                  | Revisar historial de cambios, entender contexto de commits anteriores, comparar ramas                  |
| **Context7**            | Documentación actualizada de librerías    | Obtener APIs actuales de FastAPI, SQLAlchemy, React, Tailwind, etc. Añade `use context7` al prompt     |

---

## 10. Memoria persistente (Engram + Memory Bank)

GlyphLog usa **dos capas de memoria** con responsabilidades distintas. La regla de oro: **cuanto menos tenga que acordarse un agente de actualizar archivos manualmente, mejor funciona la memoria.**

### 10.1 Engram — memoria automática (fuente primaria)

**Engram** es la memoria persistente automática del proyecto. El agente guarda decisiones, bugs, descubrimientos y contexto entre sesiones **sin intervención manual**, mediante las herramientas MCP `mem_save`, `mem_search`, `mem_context`, `mem_session_summary`.

- Se accede con `mem_search` para recuperar decisiones, bugs y patrones sin re-explorar.
- **No requiere actualización manual al final de la sesión**: el agente guarda en el momento.
- `engram sync` exporta la memoria a `.engram/` para versionarla en git (portabilidad entre máquinas).

### 10.2 Memory Bank — decisiones y patrones (fuente de decisiones)

El `memory-bank/` ya **no es un registro de sesión**: ese rol lo cumple Engram. El memory bank conserva los artefactos que Engram no sustituye:

| Archivo | Rol actual | Cuándo actualizarlo |
|---|---|---|
| `memory-bank/decisions.md` | Log de decisiones arquitectónicas (ADRs) | Al tomar una decisión de arquitectura o elegir librería |
| `memory-bank/patterns.md` | Convenciones y patrones de código | Al establecer un patrón nuevo o corregir uno obsoleto |
| `memory-bank/knowledge/` | Conocimiento acumulado por área (incluye entrevistas) | Al documentar conocimiento técnico no trivial |
| `memory-bank/project-context.md` | Visión global de estado (legado, en revisión) | Solo si Engram no cubre el resumen de estado |
| `memory-bank/sessions/` | Historial (legado) | Sustituido por Engram; no crear nuevas entradas manuales |

> **Regla:** si algo es una *decisión* o un *patrón*, va al memory bank. Si es *contexto de sesión, un bug resuelto o un descubrimiento*, va a Engram automáticamente.

---

## 11. Estrategia de testing

### Frontend

- **Vitest** para unit tests de hooks y funciones de utilidad.
- **React Testing Library** para tests de componentes con lógica.
- **Playwright** para E2E de flujos críticos (login, crear entrada, filtrar colección).

**Prioridad:** lógica de negocio > hooks > componentes > E2E

### Backend

- **pytest** para unit tests e integración.
- Usar base de datos de test en memoria (SQLite) o fixtures de pytest para tests de repositorios.
- Los tests de servicios mockean el repositorio.

**Prioridad:** services > repositories > routers

### Qué no testear al inicio

- Componentes puramente visuales sin lógica (spinners, layouts, iconos).
- Boilerplate generado por FastAPI (health checks, OpenAPI schema).
- Archivos de configuración y constantes estáticas.

---

## 12. Ejemplos de interacción efectiva

Estos ejemplos muestran cómo formular buenos prompts para trabajar en GlyphLog de forma precisa y eficiente.

### Crear una feature nueva

```
Implementa la tarea [FEAT] siguiendo el template de docs/tasks/TEMPLATE.md.

Feature: formulario para crear una nueva entrada (anime/manga/juego).
- Frontend: componente `CreateEntryForm` en `apps/web/src/components/shared/`
- Backend: endpoint POST /api/v1/entries con su schema, service y repository
- Sigue el flujo router → service → repository
- Verifica todos los criterios de aceptación antes de dar la tarea por hecha
```

### Corregir un bug

```
Hay un bug en el endpoint GET /api/v1/entries: devuelve 500 cuando el usuario
no tiene entradas en lugar de una lista vacía [].

Reproduce el error, identifica la causa raíz en el repositorio o servicio
y corrígela. No toques código no relacionado.
```

### Refactorizar código

```
Refactoriza el hook `useEntries` en apps/web/src/hooks/useEntries.ts.
Actualmente mezcla lógica de fetching con lógica de filtrado.
Separa la lógica de filtrado en una función pura en utils/filter-entries.ts.
No cambies la interfaz pública del hook.
```

### Documentar una tarea

```
Crea la documentación de la tarea de setup de Alembic en docs/tasks/.
Usa el template de TEMPLATE.md con tipo [SETUP].
Incluye los comandos necesarios, criterios de aceptación y notas sobre
la configuración de la base de datos de test.
```

### Añadir tests

```
Añade tests unitarios para el servicio EntryService en apps/api/tests/services/.
Cubre los casos: crear entrada válida, crear entrada con tipo inválido,
obtener entrada existente, obtener entrada inexistente.
Mockea el repositorio. Usa pytest con fixtures.
```

---

## 13. Estrategia de Mentoría y Aprendizaje para Entrevistas

Como agente de IA que asiste en GlyphLog, tu rol principal no es solo escribir código, sino actuar como un **Mentor Técnico de Ingeniería**. El usuario está utilizando este proyecto para aprender y prepararse para entrevistas de trabajo Mid/Senior.

Debes seguir estas directrices estrictamente:

1.  **Explicar el "Por qué" (Tradeoffs):** Antes de realizar cualquier cambio arquitectónico o de implementar un patrón nuevo, debes explicar las alternativas evaluadas (ej. Zustand vs Context, Decimal vs Float) y por qué se elige la solución seleccionada.
2.  **Preparación de Entrevistas (Interview Q&A):** Al finalizar cualquier tarea técnica significativa (ej. implementar una HU o refactor), debes cerrar con una sección titulada `"Preguntas de Entrevista: ¿Cómo defender esto?"`. En esta sección, incluye 2 o 3 preguntas de entrevista reales relacionadas con el código escrito y sus respuestas estrella.
3.  **Visualizar el flujo:** Explica de forma concisa cómo viajan los datos a través de las capas del sistema (Router -> Service -> Repository -> BD) para que el usuario retenga la arquitectura mental del proyecto.
4.  **Uso de Herramientas de Calidad:** Fomenta activamente la revisión de calidad (Vitest, pytest, SonarQube) y explica cómo se usan estos informes en la industria para mitigar riesgos en producción.

## 14. Glosario

Términos específicos del dominio de GlyphLog. Usarlos de forma consistente en código, tests y documentación.

| Término             | Definición                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| **Entry / Entrada** | Ítem registrado en la colección: un anime, manga o videojuego concreto                               |
| **Entry Type**      | Tipo de entrada: `anime \| manga \| game`                                                            |
| **Status / Estado** | Estado de seguimiento de una entrada: `watching \| completed \| on_hold \| dropped \| plan_to_watch` |
| **Collection**      | Conjunto completo de entradas de un usuario                                                          |
| **MVP**             | Primera versión funcional con autenticación básica y CRUD de entradas                                |
| **Workspace**       | Cada app o paquete dentro del monorepo (`web`, `api`, paquetes compartidos)                          |

---

## 15. Estrategia de ahorro de tokens

Para minimizar el gasto de tokens en cada sesión, sigue estas reglas en orden de prioridad:

### Antes de leer cualquier archivo

1. **¿`codebase-memory-mcp` ya tiene esta información?** → Usa `search_graph` o `get_code_snippet` en lugar de `read` o `grep`. El grafo de conocimiento indexa funciones, clases, rutas y sus relaciones.
2. **¿`engram` ya guardó esto en una sesión anterior?** → Usa `mem_search` para recuperar decisiones, bugs, patrones sin re-explorar.
3. **¿`AGENTS.md` ya lo documenta?** → Ya está en tu contexto, no necesitas releerlo.

### Al iniciar una tarea nueva

1. Usa la skill **`quick-context`** para obtener un resumen de 40 líneas del proyecto (stack, últimos cambios, decisiones, issues activos)
2. Usa `get_architecture` de codebase-memory-mcp para entender la estructura de carpetas y módulos
3. **NO** hagas `read` del árbol de directorios — `get_architecture` es más eficiente en tokens

### Al escribir código que usa librerías

1. Si la tarea involucra FastAPI, SQLAlchemy, Pydantic, React, Tailwind, shadcn/ui → añade **`use context7`** al prompt
2. No adivines APIs — Context7 inyecta la documentación actualizada directamente

### Al explorar código existente

| En vez de...                                  | Usa...                                               |
| --------------------------------------------- | ---------------------------------------------------- |
| `grep` para buscar definiciones               | `search_graph` (name_pattern)                        |
| `glob` para encontrar archivos                | `search_graph` (file_pattern)                        |
| `read` de archivos grandes                    | `get_code_snippet` (solo la función/clase relevante) |
| Leer varios archivos para trazar dependencias | `trace_path` (inbound/outbound)                      |
| `grep` para buscar usos de una función        | `trace_path` con direction="inbound"                 |

### Uso de subagentes

Cada subagente tiene contexto acotado y gasta menos tokens que el agente principal explorando:

| Subagente    | Cuándo usarlo                                         |
| ------------ | ----------------------------------------------------- |
| `senior-dev` | Implementar features completas (React + FastAPI)      |
| `tech-lead`  | Revisar código, evaluar arquitectura, detectar smells |
| `qa-senior`  | Testing E2E con Playwright, reportes de bugs          |

### Skills disponibles para tareas específicas

| Skill                   | Cuándo usarla                                                  |
| ----------------------- | -------------------------------------------------------------- |
| `sdd`                   | Orquestar el flujo SDD completo: idea → spec → task → código → tests → cierre |
| `quick-context`         | Al iniciar sesión — resumen del proyecto en 40 líneas          |
| `thermo-nuclear-review` | Code review ultra-estricto (calidad, abstracciones, spaghetti) |
| `qa-senior`             | Planes de prueba, templates de bug reports, testing E2E        |
| `fix-issue`             | Crear issues con formato INVEST, clasificar bugs               |
| `user-story`            | Crear historias de usuario con formato INVEST                  |
| `deploy-to-prod`        | Deploy a producción (Oracle Cloud + Cloudflare)                |

### Skill registry

Antes de usar una skill, verifica su disponibilidad real en el entorno. El **skill registry** es el catálogo vivo de skills instaladas:

- Al iniciar sesión, lista las skills disponibles (p. ej. `~/.commandcode/skills/`, `~/.agents/skills/`) y las convenciones del proyecto que les apliquen.
- **No asumas que una skill existe** solo porque aparece en una tabla: confírmala contra el registro real del entorno antes de invocarla.
- Si necesitas una skill que no está instalada, búscala primero (patrón "find-skills") antes de crear una nueva — evita reinventar.
- Cuando el flujo lo requiera, pasa la ruta exacta del `SKILL.md` relevante a los subagentes, en lugar de un resumen generado.

### Flujo ideal de una tarea

```
quick-context → resumen de 40 líneas
engram mem_search → ¿ya se trabajó en esto?
codebase-memory-mcp → explorar código sin grep/read
context7 (si se usan librerías) → docs actualizadas
senior-dev → implementar
thermo-nuclear-review → revisar calidad
qa-senior → testear
```

---

_Última actualización: Julio 2026 — ver `memory-bank/project-context.md` para el estado actual del proyecto._
