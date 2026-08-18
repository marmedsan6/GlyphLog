# [TEST] Ampliación acceptance tests E2E — progreso, búsqueda global y paginación (RF-8..RF-11)

> **Estado:** completada
> **Prioridad:** media
> **Dependencias:** `TEST-e2e-acceptance-tests.md` (suite base RF-0..RF-7)

## Contexto

La suite E2E (`apps/e2e`) ya cubría el happy path de RF-0..RF-7 con 47 tests Chromium. Quedaban sin cobertura flujos de negocio ya implementados en el frontend: progreso rápido e inline desde la tarjeta, historial y reset de progreso, búsqueda global del header y paginación. Además se aplicaron refactors ligeros para alinear la base con las buenas prácticas del `e2e-tests/AGENTS.md`.

## Objetivo

Añadir acceptance tests para los flujos RF-8..RF-11 con criterios de aceptación extraídos de las HUs del GitHub Project #2, y consolidar la base con Page Objects.

## Especificación

**Spec:** [`docs/specs/SPEC-e2e-acceptance-tests.md`](../specs/SPEC-e2e-acceptance-tests.md) — estado `implementada` (ampliada con RF-8..RF-11).

**Contrato (HUs de origen):**
- RF-8 — quick progress desde tarjeta → issues #34 (acciones rápidas) y #39 (edición inline).
- RF-9 — historial y reset → issues #33 (actualización manual), #35 (historial).
- RF-10 — búsqueda global → issue #21.
- RF-11 — paginación (>15 entradas) → issue #8.

## Tareas técnicas

- [x] Refactor: migrar `theme.spec.ts` a `HomePage` (eliminar clase inline `ThemeToggle`).
- [x] Refactor: unificar `registerTestUser` en `auth-helper.ts` (login por UI usa el mismo helper).
- [x] Refactor: limpiar `BasePage.ts` (eliminar métodos anti-patrón con selectores string/booleanos).
- [x] Helper: `createEntriesViaApi` (paginación) y `updateProgressViaApi` (historial) en `utils/helpers.ts`.
- [x] Page objects: `CollectionPage.entryCard()`, paginación; `EntryDetailPage` timeline/reset; `AppLayout` search.
- [x] Spec `quick-progress.spec.ts` (RF-8): 4 tests.
- [x] Spec `progress-history.spec.ts` (RF-9): 3 tests.
- [x] Spec `global-search.spec.ts` (RF-10): 3 tests.
- [x] Spec `pagination.spec.ts` (RF-11): 1 test.

## Criterios de aceptación

- ✅ Los 4 specs nuevos pasan en Chromium (11 tests) contra backend real + usuarios únicos.
- ✅ `npx tsc --noEmit` sin errores.
- ✅ Los refactors no rompen los 47 tests existentes.
- ✅ Cada criterio de aceptación traza a una HU del GitHub Project #2 (issues #8, #21, #33, #34, #35, #39).
- ✅ Sin `waitForTimeout` ni selectores CSS frágiles; uso de roles/aria-labels y Page Objects.

## Notas técnicas

- La unidad de progreso se deriva automáticamente del tipo en el backend (`FIXED_UNIT_BY_TYPE`), así que las entradas creadas vía API con `progress_total` ya quedan con `progress_unit` asignada (episodios para anime).
- El botón rápido de la card usa `aria-label="Incrementar progreso de {title}"`; el editor inline usa `aria-label="Editar progreso de {title}: {valor}"` en lectura y un `<input type="number">` en edición.
- El reset se dispara cambiando el tipo de una entrada con historial (el backend devuelve 409 y el frontend abre `ResetProgressModal`).
- La paginación usa el `DEFAULT_LIMIT=15` del frontend (`useEntries.ts`), que coincide con el backend.

## Archivos relevantes

- `apps/e2e/e2e-tests/tests/collection/quick-progress.spec.ts`
- `apps/e2e/e2e-tests/tests/entry-detail/progress-history.spec.ts`
- `apps/e2e/e2e-tests/tests/collection/global-search.spec.ts`
- `apps/e2e/e2e-tests/tests/collection/pagination.spec.ts`
- `apps/e2e/e2e-tests/page-objects/CollectionPage.ts`
- `apps/e2e/e2e-tests/page-objects/EntryDetailPage.ts`
- `apps/e2e/e2e-tests/page-objects/AppLayout.ts`
- `apps/e2e/e2e-tests/page-objects/BasePage.ts`
- `apps/e2e/e2e-tests/utils/helpers.ts`
- `apps/e2e/e2e-tests/utils/auth-helper.ts`
