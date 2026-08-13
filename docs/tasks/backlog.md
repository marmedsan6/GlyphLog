# Backlog — GlyphLog

> Tabla central de estado de las tareas y especificaciones del proyecto.
> Al crear una tarea nueva (tras aprobar su spec), añádela aquí. Al moverla de estado, actualiza tanto esta tabla como la línea `> **Estado:**` del task doc.

## Tareas

| ID                                                                    | Título                                                  | Tipo  | Estado      | Spec | Notas                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------- | ----- | ----------- | ---- | -------------------------------------------------------- |
| [FEAT-implementar-apis-frontend](./FEAT-implementar-apis-frontend.md) | Integración de APIs en frontend (CRUD entradas + cover) | FEAT  | completada  | —    | CRUD básico, endpoint detail/update/delete, cover upload |
| [FEAT-youtube-discovery](./FEAT-youtube-discovery.md)                 | Descubrimiento de contenido desde canales de YouTube    | FEAT  | completada  | —    | Spec retroactiva, escrita tras implementar (2026-08-06)  |
| [FEAT-image-cropper](./FEAT-image-cropper.md)                         | Recortador de portadas con react-easy-crop              | FEAT  | completada  | —    | Solo frontend, sin cambios de backend                    |
| [FIX-cache-leak-on-logout](./FIX-cache-leak-on-logout.md)             | Fuga de caché TanStack Query al cerrar sesión           | FIX   | completada  | —    | P0: leak de datos entre usuarios                         |
| [FIX-dark-mode-autocomplete](./FIX-dark-mode-autocomplete.md)         | Visibilidad del autocompletado en modo oscuro           | FIX   | completada  | —    | P2: dropdown invisible en dark mode                      |
| [FIX-extension-add-entry](./FIX-extension-add-entry.md)               | Añadir entrada desde la extensión de Chrome             | FIX   | completada  | —    | Contrato multipart más detallado de la carpeta           |
| [FIX-google-oauth-local-setup](./FIX-google-oauth-local-setup.md)     | Google OAuth en entorno local                           | FIX   | completada  | —    | Comportamiento degradado 503                             |
| [PLAN-batch-fixes-julio-2026](./PLAN-batch-fixes-julio-2026.md)       | Batch de fixes y mejoras de julio 2026                  | PLAN  | completada  | —    | Plan puro, sin spec subyacente                           |
| [google-oauth-cloud-setup](./google-oauth-cloud-setup.md)             | Setup de Google OAuth en producción                     | SETUP | completada  | —    | Contract: POST /api/v1/auth/google, scopes, errores      |
| [TEST-e2e-acceptance-tests](./TEST-e2e-acceptance-tests.md)           | Suite de acceptance tests E2E (RF-0..RF-7)              | TEST  | completada  | [SPEC-e2e-acceptance-tests](../specs/SPEC-e2e-acceptance-tests.md) | 47 tests Chromium; LLM mockeado; fix auth + rate limit dev |
| —                                                                     | Flujo SDD (specs, template, backlog)                    | SETUP | en-progreso | —    | ADR-015; este plan                                   |

## Especificaciones

| ID  | Estado | Plan/Task derivado |
| --- | ------ | ------------------ |
| [SPEC-e2e-acceptance-tests](../specs/SPEC-e2e-acceptance-tests.md) | implementada | [TEST-e2e-acceptance-tests](./TEST-e2e-acceptance-tests.md) |
