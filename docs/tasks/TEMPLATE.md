# [TIPO] Título descriptivo de la tarea

> **Estado:** backlog | en-progreso | completada
> **Prioridad:** alta | media | baja
> **Dependencias:** ninguna | [TAREA-X]

## Contexto

¿Qué existe actualmente? ¿Qué antecede a esta tarea?

## Objetivo

¿Qué se quiere conseguir con esta tarea? Una frase clara.

## Especificación

> La especificación técnica formal debe definirse y aprobarse **antes** de desglosar en tareas (flujo SDD: spec → plan → tasks → código → tests → validación).

- **Tier 3 (feature grande: auth, importaciones, integraciones):** la spec vive en `docs/specs/SPEC-<slug>.md` como artefacto independiente. Enlázala aquí y resume el contrato en 2-3 líneas:

  ```markdown
  **Spec:** [`docs/specs/SPEC-<slug>.md`](../specs/SPEC-<slug>.md) — estado `aprobada`
  **Contrato:** `POST /api/v1/...`; schemas `X`/`Y`; tabla `z`; edge cases: ...
  ```

- **Tier 2 (feature pequeña: un endpoint, un componente):** la spec es un bloque compacto inline aquí, con el mismo contenido esencial que `TEMPLATE-SPEC.md`:
  - **API contract:** endpoint(s), método, request/response, status codes y errores posibles.
  - **Schemas:** campos, tipos, validaciones (Pydantic / TypeScript).
  - **Data models:** tablas o columnas nuevas, relaciones, migraciones.
  - **Edge cases:** los "¿y si...?" que el código debe manejar (config ausente, datos vacíos, errores externos).
  - **Fuera de alcance:** lo que explícitamente NO se hace.

- **Tier 1 (fix trivial: typo, bug puntual < 10 min):** no requiere spec; escribe `N/A`.

## Tareas técnicas

- [ ] Subtarea 1
- [ ] Subtarea 2

## Criterios de aceptación

- ✅ El usuario puede hacer X
- ✅ La API devuelve Y con status Z
- ✅ Los tests relevantes pasan
- ✅ El código sigue las convenciones del proyecto

## Notas técnicas

Decisiones, referencias a docs, consideraciones especiales.

## Archivos relevantes

- `apps/web/src/...`
- `apps/api/app/...`

---

## Tipos válidos

| Tipo       | Cuándo usarlo                                                                     |
| ---------- | --------------------------------------------------------------------------------- |
| `FEAT`     | Nueva funcionalidad visible para el usuario o que expande la API                  |
| `FIX`      | Corrección de un bug concreto y reproducible                                      |
| `REFACTOR` | Mejora interna del código sin cambio de comportamiento observable                 |
| `DOCS`     | Crear o actualizar documentación (README, architecture, memory-bank)              |
| `SETUP`    | Configuración de entorno, infraestructura, herramientas o scaffolding             |
| `TEST`     | Añadir tests que faltan o corregir tests rotos (sin cambiar código de producción) |
| `CHORE`    | Mantenimiento rutinario: actualizar dependencias, ajustar CI, limpiar archivos    |
