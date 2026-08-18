---
name: sdd
description: "Guía al agente a través del flujo completo Specification-Driven Development (SDD) de GlyphLog: idea → tier → spec → gate de aprobación (plan mode) → task doc → implementación → tests → validación → cierre. Orquesta las skills existentes (user-story, deploy-to-prod, thermo-nuclear-review) y los artefactos del repo (docs/specs/, docs/tasks/, backlog.md, memory-bank). Usar cuando el usuario quiere crear algo nuevo, implementar una feature, o formalizar una idea siguiendo el flujo spec → plan → tasks → código → tests → validación."
---

# SDD — Specification-Driven Development en GlyphLog

Skill que orquesta el flujo Specification-Driven Development de GlyphLog. No implementa por su cuenta: guía al agente fase a fase, reutilizando las skills y artefactos existentes para no duplicar lógica.

## When to use

- El usuario dice "quiero hacer algo nuevo", "tengo una idea", "nueva feature", "implementa X"
- El usuario quiere formalizar una idea antes de escribir código
- El usuario pide seguir el flujo SDD o "hazlo como siempre"

## When NOT to use

- Fix trivial (< 10 min): typo, bug puntual, ajuste de texto → Tier 1, directo al código (ver sección de tiers)
- El usuario pide explícitamente código inmediato sin spec (preguntar si es intencional antes de saltarse el flujo)
- Tareas que no son features nuevas (mantenimiento de deps, CI) → usar tipo CHORE sin spec

## Regla de oro

> **La spec está lista cuando puedes escribir los tests solo leyéndola.**

Si no puedes escribir los tests de aceptación solo con la spec, la spec no está completa.

---

## El flujo en una línea

```
idea → tier → spec → gate (plan mode) → task doc → código → tests → validación → cierre
```

Cada fase se aprueba antes de pasar a la siguiente. Nada se implementa sin spec aprobada (excepto Tier 1).

---

## Fase 0 — Captura de la idea y decisión de tier

Cuando el usuario trae una idea, NO escribas código todavía. Primero:

1. **Captura la idea** en máximo 10 líneas:
   - ¿Qué problema resuelve?
   - ¿Quién lo usa / qué usuario afecta?
   - ¿Por qué ahora?

2. **Decide el tier**:

| Tier | Cuándo | Artefacto |
|------|--------|-----------|
| **1** | Fix trivial (< 10 min): typo, bug puntual | Sin spec, directo al código |
| **2** | Feature pequeña: un endpoint, un componente | Sección `## Especificación` compacta inline en el task doc |
| **3** | Feature grande: auth, importaciones, descubrimiento, integraciones | Spec propia en `docs/specs/SPEC-<slug>.md` + gate de revisión |

3. **Si el tier es ambiguo, pregunta al usuario.** No asumas que algo es "pequeño" si toca BD + API + frontend.

### Fase 0.5 — Captura como HU (opcional pero recomendado para Tier 2 y 3)

Para features nuevas (no fixes triviales), reutiliza la skill `user-story` para capturar la idea como historia de usuario INVEST y subirla a GitHub Project #2:

- La skill `user-story` ya hace el Q&A iterativo, genera la HU INVEST, y crea el issue en GitHub.
- La HU en GitHub es el **issue de tracking**, no el contrato técnico. El contrato técnico vive en la spec (Tier 3) o en el task doc (Tier 2).
- Si el usuario no quiere issue en GitHub, salta este paso y trabaja solo local.

**Regla de separación:**
- `user-story` → produce la HU INVEST y el issue en GitHub (qué y por qué, a nivel de negocio).
- `sdd` → produce la spec técnica (Tier 3) o el bloque inline (Tier 2), y el task doc (cómo, a nivel técnico).

---

## Fase 1 — Tier 1: Fix trivial (directo al código)

Si es Tier 1, no hay spec. Pero sigue estas reglas mínimas:

1. Reproduce/confirma el problema antes de tocar código.
2. Cambio mínimo y acotado. No refactorizar de paso.
3. Verifica con el test/lint/build relevante.
4. Documenta brevemente en `memory-bank/sessions/` si fue significativo.

No uses esta fase como excusa para saltarte el flujo en features que en realidad son Tier 2/3.

---

## Fase 2 — Tier 3: Escribir la spec

1. **Copia la plantilla:**
   ```bash
   cp docs/specs/TEMPLATE-SPEC.md docs/specs/SPEC-<slug>.md
   ```
   - `<slug>` en kebab-case, descriptivo: `SPEC-youtube-discovery.md`, `SPEC-google-oauth.md`.

2. **Rellena TODAS las secciones.** Si una no aplica, escribe `N/A`. Las secciones obligatorias:
   - **Contexto** — qué existe hoy, qué antecede.
   - **Objetivo** — una frase clara.
   - **Requisitos funcionales** — historias _Como / Quiero / Para_ (comportamiento, no código).
   - **API contract** — endpoint, método, request/response, status codes, **todos los errores posibles**.
   - **Schemas Pydantic** — campos, tipos, validaciones, ejemplos (nivel de campo).
   - **Data models** — tablas, columnas, relaciones, migraciones Alembic.
   - **Edge cases** — "¿y si...?" cada uno convertible en test.
   - **Fuera de alcance** — lo que explícitamente NO se hace.
   - **Criterios de salida** — checklist de auto-revisión.

3. Marca `> **Estado:**` como `borrador`.

4. **Aplica la regla de oro**: ¿puedes escribir los tests solo leyendo la spec? Si no, vuelve a rellenar lo que falte (normalmente edge cases o contrato de errores).

---

## Fase 3 — Gate de aprobación (plan mode)

**Solo Tier 3.** La spec se somete a revisión ANTES de crear el task doc:

1. Entra en **plan mode** (`enter_plan_mode`).
2. El planificador valida la spec contra el código real.
3. Resultado:
   - ✅ **Aprobada** → pasa a Fase 4.
   - ❌ **Rechazada** → vuelve a Fase 2; normalmente falta contrato, esquema o edge cases.

**Tier 2** no necesita plan mode: la spec inline se revisa manualmente con el usuario antes de implementar.

---

## Fase 4 — Crear el task doc

**Solo tras aprobar la spec (Tier 3) o validar el bloque inline (Tier 2).**

1. **Copia la plantilla:**
   ```bash
   cp docs/tasks/TEMPLATE.md "docs/tasks/<TIPO>-<slug>.md"
   ```
   - Tipos válidos: `FEAT`, `FIX`, `REFACTOR`, `DOCS`, `SETUP`, `TEST`, `CHORE`.

2. **Rellena la sección `## Especificación`:**
   - **Tier 3** — enlaza la spec:
     ```markdown
     **Spec:** [`docs/specs/SPEC-<slug>.md`](../specs/SPEC-<slug>.md) — estado `aprobada`
     **Contrato:** `POST /api/v1/...`; schemas `X`/`Y`; tabla `z`; edge cases: ...
     ```
   - **Tier 2** — bloque compacto inline con API contract, schemas, data models, edge cases, fuera de alcance.
   - **Tier 1** — escribe `N/A`.

3. **Añade la tarea a `docs/tasks/backlog.md`** (ID, título, tipo, estado).

4. **En la spec (Tier 3)**, rellena `> **Plan/Task derivado:**` con el enlace al task doc.

---

## Fase 5 — Implementar

Sigue la arquitectura estrictamente. **Backend:**
```
Router → Service → Repository → Base de datos
```
- Router: valida request, delega al service, devuelve response. Nunca toca la BD.
- Service: lógica de negocio. No habla con BD directamente.
- Repository: única capa que ejecuta SQL/ORM.

**Frontend:**
```
services → hooks → componentes
```

Cada **criterio de aceptación** del task doc traza a un **requisito funcional** de la spec (Tier 3) o del bloque inline (Tier 2).

Reglas:
- Leer el código existente antes de escribir (convenciones, patrones).
- Cambios atómicos, no tocar código no relacionado.
- Si surge una decisión de arquitectura nueva → apuntarla para el ADR (Fase 7).

---

## Fase 6 — Tests y validación

| Capa | Herramienta | Qué testear |
|------|-------------|-------------|
| Backend | `pytest` | services > repositories > routers |
| Frontend | `Vitest` + `RTL` | hooks y utils > componentes |
| E2E | `Playwright` (`apps/e2e/`) | flujos críticos |
| Calidad | `sonar`, `lint`, `tsc`, `build` | run completo antes de cerrar |

```bash
pnpm build            # build de todos los workspaces
pnpm lint             # linting
pnpm test             # tests unitarios (turbo)
pnpm turbo run e2e    # tests E2E con Playwright
```

Para code review ultra-estricto de la implementación, reutiliza la skill `thermo-nuclear-review`.

---

## Fase 7 — Cierre

1. Cambia el estado de la spec → `implementada` (Tier 3) o el task doc → `completada`.
2. Actualiza `docs/tasks/backlog.md`.
3. Crea entrada en `memory-bank/sessions/` con sección **Validación** (qué se validó, cómo, resultados).
4. Si hubo decisión de arquitectura nueva → añade ADR en `memory-bank/decisions.md`.
5. Si es un deploy → reutiliza la skill `deploy-to-prod` (no duplicar su lógica).

---

## Reglas de trazabilidad (no negociables)

```
spec → task doc → criterios de aceptación → código → tests
```

- Si un eslabón falta, el flujo no es conforme.
- Cada criterio de aceptación traza a un requisito de la spec.
- Los commits de features referencian task doc y spec.

---

## Auditoría SDD

Ejecuta el checklist de `docs/specs/README.md` periódicamente (fin de milestone o sesión significativa):

1. ¿Existe `docs/specs/` y se usa `TEMPLATE-SPEC.md` para Tier 3?
2. ¿Cada task doc tiene `## Especificación` antes de `## Tareas técnicas`?
3. ¿Los Tier 3 referencian una spec con estado `aprobada`/`implementada`?
4. ¿Las specs incluyen API contract, schemas, data models y edge cases?
5. ¿Ningún task doc mezcla spec + plan + implementación?
6. ¿Cada criterio de aceptación traza a un requisito?
7. ¿Los commits referencian task doc y spec?
8. ¿Toda decisión de arquitectura nueva tiene ADR?
9. ¿Hay sesión en `memory-bank/sessions/` tras trabajo significativo?
10. ¿El gate (plan mode + Criterios de salida) se usó antes de generar tasks?

---

## Anti-patrones

| Anti-patrón | Qué hacer |
|-------------|-----------|
| Saltar de idea a código sin spec (Tier 2/3) | Detener y aplicar Fase 0 |
| Mezclar spec + plan + implementación en un solo doc | Separar: spec (qué) vs task doc (cómo) |
| Spec sin edge cases ni errores | Volver a Fase 2, rellenar |
| Task doc sin enlazar la spec | Volver a Fase 4 |
| No marcar el estado al cerrar | Actualizar `backlog.md` y el estado |
| Duplicar lógica de user-story o deploy-to-prod | Reutilizar esas skills |

---

## Ejemplo de flujo completo (Tier 3)

**Usuario:** "Quiero poder importar mi lista de anime desde un archivo .gz"

**Agente (sdd):**
1. **Fase 0**: captura — "importar anime desde .gz, usuario de colección, sin importación hoy". Tier 3 (importación = integración).
2. **Fase 0.5**: reutiliza `user-story` → crea HU INVEST en GitHub.
3. **Fase 2**: crea `docs/specs/SPEC-mal-import.md` con API contract (`POST /api/v1/imports/mal`), schemas (`ImportRequest`, `ImportResponse`), data models (tabla `import_jobs`), edge cases (.gz corrupto, duplicados, rate limit).
4. **Fase 3**: entra en plan mode → aprueba la spec.
5. **Fase 4**: crea `docs/tasks/FEAT-mal-import.md` enlazando la spec; añade a `backlog.md`.
6. **Fase 5**: implementa router → service → repository.
7. **Fase 6**: pytest (service/repository), `pnpm test`, `pnpm build`.
8. **Fase 7**: estado `implementada`, sesión en memory-bank, ADR si hay decisión.

---

## Referencias

- `docs/specs/README.md` — flujo SDD y tiers (fuente de verdad)
- `docs/specs/TEMPLATE-SPEC.md` — plantilla de spec (Tier 3)
- `docs/tasks/TEMPLATE.md` — plantilla de task doc
- `docs/tasks/backlog.md` — tabla central de estado
- `AGENTS.md` §6.5 — flujo SDD; §6 — arquitectura; §11 — testing
- `memory-bank/decisions.md` — ADRs
- Skills reutilizables: `user-story` (captura INVEST), `thermo-nuclear-review` (review), `deploy-to-prod` (deploy)
