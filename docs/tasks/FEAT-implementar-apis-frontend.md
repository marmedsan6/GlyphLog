# [FEAT] Implementar APIs - Frontend

> **Estado:** completada  
> **Prioridad:** alta  
> **Dependencias:** Implementar APIs - Backend

## Contexto

El backend ya expone los endpoints necesarios para gestionar entradas individuales:

- `GET /api/v1/entries/{entry_id}` — consultar detalle  
- `PUT /api/v1/entries/{entry_id}` — actualizar campos editables (todos opcionales)  
- `DELETE /api/v1/entries/{entry_id}` — eliminar entrada  

En el frontend, la ruta `/entries/:id` (`apps/web/src/pages/entry-detail/entry-detail.page.tsx`) es actualmente un placeholder con los TODOs T-012 (edicion) y T-013 (eliminacion). Ademas, los tipos autogenerados de OpenAPI estan desactualizados y no reflejan el schema completo de `EntryUpdate` ni el metodo `PUT`.

## Objetivo

Permitir al usuario autenticado ver el detalle de una entrada, editar sus datos y eliminarla, todo desde el frontend con el mismo estilo y convenciones del resto de la aplicacion.

## Tareas tecnicas

- [x] Regenerar tipos OpenAPI ejecutando `pnpm --filter web generate-types`.
- [x] Anadir servicios `getEntry`, `updateEntry` y `deleteEntry` en `apps/web/src/services/entry.service.ts`.
- [x] Anadir hooks `useEntry`, `useUpdateEntry` y `useDeleteEntry` en `apps/web/src/hooks/`.
- [x] Implementar pagina de detalle con modo lectura y modo edicion.
- [x] Hacer clicables las tarjetas de la coleccion para navegar al detalle.
- [x] Instalar y usar `alert-dialog` de shadcn/ui para la confirmacion de eliminacion.
- [x] Extraer o reutilizar los campos del formulario de entrada para evitar duplicacion con `CreateEntryPage`.
- [x] Anadir/actualizar tests unitarios de hooks y componentes (Vitest + React Testing Library).
- [x] Actualizar `docs/tasks/backlog.md` y el `memory-bank/project-context.md` si es necesario.

## Criterios de aceptacion

- ✅ Desde `/collection`, clicar una tarjeta de entrada navega a `/entries/:id`.
- ✅ La pagina de detalle muestra: titulo, tipo, estado, puntuacion, anio, notas e imagen de portada.
- ✅ Pulsar "Editar" activa el modo edicion con un formulario que permite modificar todos los campos editables.
- ✅ Pulsar "Cancelar" vuelve al modo lectura sin guardar cambios.
- ✅ Al guardar, se envia `PUT /api/v1/entries/{id}`; si tiene exito, se muestra un toast y se refresca el detalle.
- ✅ Se pueden limpiar los campos opcionales (`rating`, `year`, `notes`, `cover_image`) enviando `null`.
- ✅ Se puede cambiar la imagen de portada o eliminar la existente; si no se envia imagen, se conserva la actual.
- ✅ Pulsar "Eliminar" abre un dialogo de confirmacion; al confirmar, se llama `DELETE /api/v1/entries/{id}` y se redirige a `/collection`.
- ✅ Si ocurre un error de API, se muestra un mensaje descriptivo al usuario.
- ✅ Pasan `pnpm --filter web test`, `pnpm --filter web lint` y `pnpm --filter web typecheck`.
- ✅ El QA senior cubre con Playwright los flujos E2E principales.

## Notas tecnicas

- Seguir el estilo visual de `CreateEntryPage` y los componentes shadcn/ui ya instalados.
- Usar **named exports** en todos los componentes y hooks nuevos.
- Tipar todo en TypeScript; evitar `any`.
- Invalidar la query de listado (`ENTRIES_QUERY_KEY`) tras editar o eliminar para mantener la coleccion sincronizada.
- Los tipos OpenAPI se regeneran automaticamente; no editar `api.d.ts` a mano.
- Si la regeneracion de tipos requiere que el backend este corriendo, arrancar `pnpm --filter api dev` o `docker compose up -d` primero.

## Actualizaciones posteriores (Opcion A + correcciones del tech-lead)

- Se implemento el endpoint backend `POST /api/v1/entries/{entry_id}/cover` para subir la imagen de portada por separado del PUT de metadatos.
- `apps/web/src/services/entry.service.ts` ahora expone `uploadCoverImage` y `updateEntry` sube la imagen primero cuando `cover_image` es `File`.
- Se aplicaron las correcciones de warnings del tech-lead: preview de imagen al eliminar, parseo de errores 422, control del dialogo de eliminacion, invalidacion async de queries, reset de formulario con `keepDirtyValues`, confirmacion al cancelar cambios y consistencia del tipo `EntryUpdateFormData`.

## Archivos relevantes

- `apps/web/src/pages/entry-detail/entry-detail.page.tsx`
- `apps/web/src/pages/create-entry/create-entry.page.tsx`
- `apps/web/src/services/entry.service.ts`
- `apps/web/src/hooks/useEntries.ts`
- `apps/web/src/hooks/use-create-entry.ts`
- `apps/web/src/hooks/useUpdateEntry.ts`
- `apps/web/src/utils/api-errors.ts`
- `apps/web/src/components/shared/entry-form/image-uploader.tsx`
- `apps/web/src/components/shared/entry-card.tsx`
- `apps/web/src/pages/collection/collection.page.tsx`
- `apps/web/src/types/api.d.ts`
- `apps/web/src/types/index.ts`
- `apps/web/package.json`
- `apps/api/app/routers/entries.py`
- `apps/api/app/services/entry_service.py`
- `apps/api/tests/test_upload_cover.py`
- `docs/tasks/backlog.md`
- `memory-bank/project-context.md`
