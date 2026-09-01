# AGENTS.md — GlyphLog

Fuente de verdad operativa para agentes de IA. Mantén este archivo breve: las instrucciones especializadas viven en skills y la documentación extensa en `docs/` y `memory-bank/`.

## Proyecto

GlyphLog es una aplicación personal y de portfolio para registrar anime, manga y videojuegos, seguir su progreso y obtener descubrimiento y recomendaciones.

- Frontend: React 18, Vite, TypeScript, Tailwind CSS y shadcn/ui.
- Backend: FastAPI, Python 3.11+, Pydantic, SQLAlchemy y Alembic.
- Datos: PostgreSQL.
- Monorepo: Turborepo y pnpm workspaces.
- Infra local: Docker Compose.
- Apps: `apps/web`, `apps/api` y `apps/extension`.

Consulta `README.md` y `docs/SETUP.md` para onboarding. Las decisiones vigentes están en `memory-bank/decisions.md`.

## Autorización y ruta de trabajo

Primero determina si el usuario ha autorizado una mutación. Investigar, explicar, comparar, auditar o crear un plan son tareas de solo lectura salvo petición explícita de implementar.

Tras autorizarse el cambio, elige la ruta más pequeña que resuelva el resultado:

- **Directa inline:** comprender exige 1–3 archivos o el cambio es mecánico y ya está entendido.
- **Directa delegada:** comprender exige 4+ archivos, hay investigación amplia o un escritor tocará 2+ archivos no triviales.
- **SDD opcional:** hay ambigüedad sustancial y una spec, test design y task durables reducen el riesgo. Solo se activa si el usuario lo pide o acepta la propuesta.

No uses el tamaño del diff como único criterio. Pregunta cualquier duda que cambie alcance, arquitectura, datos, seguridad o resultado; comunica también inconsistencias importantes aunque no bloqueen.

Receipt-Driven Development de Gentle AI es opt-in. Nunca ejecutes `review mode enable` sin petición explícita. Una revisión de Gentle informa; no autoriza commit, push, PR ni release.

## Descubrimiento y contexto

Para código, usa este orden:

1. `codebase-memory-mcp`: `search_graph`, `trace_path`, `get_code_snippet`, `query_graph`, `get_architecture`.
2. Engram: recuperar decisiones y descubrimientos previos con `mem_search`/`mem_context` si están disponibles.
3. `rg`/lectura de archivos para strings, configuración, documentación o cuando el grafo sea insuficiente.

Para APIs cambiantes de React, FastAPI, SQLAlchemy, Pydantic, Tailwind o shadcn/ui, consulta documentación actual antes de implementar.

Las skills canónicas heredadas siguen en `.opencode/skills/`; `.agents/skills/` contiene adaptadores para que Codex las descubra. Lee siempre el `SKILL.md` activado antes de actuar.

## Arquitectura

### Frontend

```text
apps/web/src/
├── components/ui       # base shadcn; no modificar directamente
├── components/shared   # componentes de dominio
├── pages
├── hooks
├── services
├── types
├── utils
└── lib
```

Flujo preferido: `services → hooks → componentes`. Mantén los componentes pequeños y la lógica de negocio fuera de la vista.

### Backend

```text
apps/api/app/
├── routers
├── services
├── repositories
├── schemas
├── models
├── core
└── main.py
```

Flujo obligatorio:

```text
Router → Service → Repository → Base de datos
```

- Routers: validan, delegan y forman la respuesta.
- Services: contienen lógica de negocio.
- Repositories: son la única capa que ejecuta queries.
- Models: definen esquema; no contienen lógica de negocio.
- Toda entrada y salida de API usa schemas Pydantic.

## Convenciones de código

### Generales

- Prioriza claridad, cambios pequeños y ausencia de sobreingeniería.
- No toques código no relacionado.
- Comenta el porqué, no lo que el código ya expresa.
- Los errores deben indicar qué falló y, cuando sea posible, por qué.
- Documenta decisiones arquitectónicas o de librería en `memory-bank/decisions.md`.

### TypeScript y React

- Tipado estricto; evita `any`, usa `unknown` con narrowing cuando proceda.
- `const` sobre `let`; nunca `var`.
- `async/await` sobre cadenas de promesas.
- Named exports para componentes.
- Funciones puras cuando sea posible y efectos secundarios dentro de hooks o services.
- Archivos TS/TSX en kebab-case, componentes en PascalCase, hooks `useX` y variables en camelCase.

### Python y FastAPI

- Type hints en todas las funciones.
- Archivos y variables en snake_case; clases en PascalCase.
- Rutas API en kebab-case; tablas y columnas en snake_case.
- No expongas modelos SQLAlchemy desde endpoints.

## Tareas, SDD y TDD

Toda tarea durable usa `docs/tasks/TEMPLATE.md`. Los tipos válidos son `FEAT`, `FIX`, `REFACTOR`, `DOCS`, `SETUP`, `TEST` y `CHORE`.

Cuando SDD esté aprobado, usa la skill `sdd` y este flujo:

```text
spec → test design → gate en Plan mode → task doc → Red → Green → Refactor → validación
```

- Tier 1: ajuste menor, fix trivial o refactor mecánico; no requiere spec separada.
- Tier 2: feature pequeña; spec y test design compactos.
- Tier 3: feature grande o integración; spec y test design completos.
- Plan mode es un gate, no un archivo `PLAN-*`.
- Para comportamiento nuevo, observa un Red válido antes del código.
- La trazabilidad final es `RF/EC → TC → test ejecutable → código → resultado`.

## Testing y calidad

Frontend:

- Vitest para lógica y hooks.
- React Testing Library para componentes con comportamiento.
- Playwright para flujos críticos.

Backend:

- pytest para unitarios e integración.
- Services mockean repositories.
- Repositories usan fixtures o una base de test aislada.

Antes de entregar, ejecuta las comprobaciones proporcionales al riesgo: tests relevantes, lint, typecheck/build y E2E cuando corresponda. Distingue fallos introducidos por el cambio de problemas de entorno o baseline y deja evidencia de ambos.

Comandos habituales:

```bash
pnpm lint
pnpm test
pnpm build
docker compose up -d
docker compose ps
```

## Git y GitHub

- Preserva cambios ajenos y evita operaciones destructivas.
- Usa commits convencionales y atómicos.
- Antes de commit/push/PR, revisa el diff de forma fresca salvo cambios mecánicos triviales.
- Nunca ejecutes `gh` directamente. Usa siempre `bash scripts/gh.sh ...`.
- El GitHub Project principal es el #2, `Backlog del proyecto`, del owner `marmedsan6`.
- Nunca incluyas tokens en el repositorio.

## Memoria y documentación

- Engram es la memoria automática para contexto de sesión, bugs y descubrimientos. Si no está disponible, no bloquees la entrega.
- `memory-bank/decisions.md`: decisiones arquitectónicas y tradeoffs.
- `memory-bank/patterns.md`: patrones de código vigentes.
- `memory-bank/knowledge/`: conocimiento técnico no trivial.
- No crees nuevas entradas manuales en `memory-bank/sessions/`.

Actualiza el backlog y los estados de spec/task al cerrar trabajo documentado.

## Mentoría

GlyphLog también prepara al usuario para entrevistas Mid/Senior. En cambios técnicos significativos:

- explica alternativas y tradeoffs antes de introducir arquitectura o patrones nuevos;
- describe de forma concisa cómo viajan los datos por las capas afectadas;
- relaciona tests, lint, build y análisis de calidad con el riesgo que reducen;
- cierra con 2–3 preguntas y respuestas bajo `Preguntas de Entrevista: ¿Cómo defender esto?`.

## Gentle AI experimental

Esta rama evalúa una capa anti-corrupción portable para Gentle AI `v2.5.0-rc.3`:

- runner y adaptador verificados: `bash scripts/gentle-ai.sh`;
- skill opt-in: `.agents/skills/gentle-review/SKILL.md`;
- estado efímero ignorado: `.gentle-ai/`;
- evaluación y rollback: `docs/experiments/gentle-ai-codex.md`.

El adaptador falla cerrado si el binario, capabilities o bundle contractual no coinciden. No ejecutes `gentle-ai install` ni invoques el binario local directamente; no habilites RDD sin autorización explícita.
