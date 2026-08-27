# [TIPO] Título descriptivo de la tarea

> **Estado:** backlog | en-progreso | completada
> **Prioridad:** alta | media | baja
> **Dependencias:** ninguna | [TAREA-X]

## Contexto

¿Qué existe actualmente? ¿Qué antecede a esta tarea?

## Objetivo

¿Qué se quiere conseguir con esta tarea? Una frase clara.

## Especificación

> Para SDD Tier 2/3, la spec y el test design se crean y aprueban **antes** de este documento. Plan mode actúa como gate; este task doc conserva sus decisiones técnicas.

- **Tier 2/3:** enlazar la spec independiente:

  ```markdown
  **Spec:** [`docs/specs/SPEC-<slug>.md`](../specs/SPEC-<slug>.md) — estado `aprobada`
  **Contrato observable:** comportamiento, entradas, salidas y errores relevantes.
  ```

- **Tier 1 (fix trivial, refactor mecánico o ajuste menor):** no requiere spec; escribe `N/A`.

## Test design

- **Tier 2/3:**

  ```markdown
  **Test design:** [`docs/test-specs/TEST-SPEC-<slug>.md`](../test-specs/TEST-SPEC-<slug>.md) — estado `aprobada`
  ```

- **Tier 1:** `N/A`. Para bugs, describir el test de regresión rojo en Tareas técnicas; para refactors, la caracterización verde previa.

### Matriz de automatización

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01 | `ruta/al/test` | unitario / integración / componente / E2E |

## Decisiones de Plan mode

- **Enfoque técnico:** ...
- **Capas afectadas:** ...
- **Dependencias y orden:** ...
- **Riesgos y mitigaciones:** ...
- **Archivos previstos:** ...

## Tareas técnicas

- [ ] **Red TC-01:** escribir el test y confirmar que falla por el comportamiento ausente/incorrecto.
- [ ] **Green TC-01:** implementar el mínimo necesario para pasarlo.
- [ ] **Refactor TC-01:** mejorar estructura manteniendo la suite verde.
- [ ] Repetir Red/Green/Refactor por cada slice de comportamiento.

## Criterios de aceptación

- ✅ El usuario puede hacer X
- ✅ La API devuelve Y con status Z
- ✅ Cada `RF/EC` traza a `TC`, test ejecutable y código
- ✅ Existe evidencia Red anterior al código para comportamiento nuevo
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
