# Sesión de Trabajo — 28 de Julio de 2026: análisis del fallo al añadir desde la extensión

## Resumen

Se analizó y ejecutó el fix del fallo reportado al confirmar “Añadir a tu lista” desde GlyphLog Companion en el contexto de las issues #40–#42. El plan queda documentado en `docs/tasks/FIX-extension-add-entry.md`.

## Hallazgos

- Issue #42: adaptador MangaDex, abierta; su implementación ya existe sin commit en `apps/extension/`.
- Logs locales: búsqueda 200 y siete creaciones 422 entre 09:40–09:46 del 28/07.
- Reproducción directa del mismo payload multipart: 201; backend/schema no son la causa.
- `background-api.ts` y `entrypoints/background.ts` se modificaron a las 09:47 para transportar un objeto plano y reconstruir `FormData`; el build usado durante el fallo era anterior.
- Crunchyroll detectó erróneamente `Crunchyroll Watch Popular Anime Play Games Shop Online`; el fallback de `document.title` se acepta demasiado pronto durante la hidratación SPA.
- Producción `glyphlog.qzz.io` devuelve 404 en `POST /api/v1/devices/activate`, mientras local devuelve 422 para body vacío; el backend de extensión aún no está desplegado.
- El manifest ahora autoriza explícitamente `glyphlog.qzz.io`, manteniendo la lista de hosts limitada y sin `<all_urls>`.

## Cambios realizados

- Extraído el contrato de construcción de peticiones a `apps/extension/src/background-request.ts`.
- Tipado `BackgroundAPIClient`, manejo de respuestas ausentes y errores FastAPI string/array.
- Añadidos tests del bridge, multipart y overlay (`42` tests totales).
- Rechazado el título genérico de navegación de Crunchyroll durante la hidratación SPA.
- Añadido estado de éxito parcial cuando la entrada se crea pero falla el progreso.
- Corregidos errores de TypeScript del workspace de la extensión y documentada la recarga del build.

## Validación ejecutada

- `pnpm --filter glyphlog-companion-extension test`: 42/42 tests pasan.
- `pnpm --filter glyphlog-companion-extension exec tsc --noEmit`: correcto.
- `pnpm --filter glyphlog-companion-extension build`: build WXT correcto; manifest generado con `https://glyphlog.qzz.io/*`.
- `docker compose ps`: API y PostgreSQL healthy; web levantada.
- Payload multipart local controlado: 201; usuario temporal eliminado después de la prueba.
- Tests backend no ejecutados: el venv local falla por `VITE_GOOGLE_CLIENT_ID` extra en Settings y la imagen Docker no incluye pytest.

## Pendiente

- Recargar el build actual en Chromium/Brave y repetir el flujo real; no había un CDP activo en `127.0.0.1:9333` durante esta sesión.
- Ejecutar E2E real para anime y MangaDex.
- Desplegar backend/migraciones de #36–#42 antes de usar la extensión contra producción; actualmente `POST /api/v1/devices/activate` devuelve 404 en `glyphlog.qzz.io`.
