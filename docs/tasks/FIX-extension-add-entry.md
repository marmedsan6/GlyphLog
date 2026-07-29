# [FIX] Corregir “Añadir a tu lista” desde GlyphLog Companion

## Contexto

La issue #42 (`MangaDexAdapter`) ya está implementada en el working tree junto con la base WXT de #40 y el adaptador AnimeFLV de #41, pero el flujo compartido del overlay falla al crear entradas nuevas.

Evidencia observada el 28 de julio de 2026:

- El emparejamiento local funciona: `POST /api/v1/devices/activate` devuelve 200.
- La búsqueda previa funciona: `GET /api/v1/entries/?search=...` devuelve 200.
- Siete intentos de “Añadir a tu lista” devolvieron `422 Unprocessable Entity` en `POST /api/v1/entries/` entre 09:40 y 09:46.
- El mismo payload enviado como multipart (`title`, `type=anime`, `status=watching`) devuelve 201 directamente contra la API local.
- `apps/extension/src/background-api.ts` y `apps/extension/src/entrypoints/background.ts` fueron modificados a las 09:47 para serializar un objeto plano entre contextos y reconstruir `FormData` en el service worker. El build cargado durante los fallos era anterior a esa corrección.
- El detector de Crunchyroll produjo el título falso `Crunchyroll Watch Popular Anime Play Games Shop Online`, por lo que existe un segundo fallo independiente: acepta el título genérico de la página antes de que la SPA exponga los metadatos del episodio.
- Producción (`https://glyphlog.qzz.io`) aún no contiene `/api/v1/devices/*` (devuelve 404) y tampoco está incluida en `host_permissions`; #36–#42 siguen sin commit/despliegue.

## Objetivo

Garantizar que confirmar “Añadir a tu lista” desde Crunchyroll, AnimeFLV o MangaDex:

1. crea una entrada mediante el contrato multipart actual;
2. actualiza su progreso inicial cuando corresponde;
3. no crea entradas con títulos genéricos o incorrectos;
4. informa correctamente si la creación funciona pero falla la actualización posterior;
5. funciona de forma verificable en desarrollo y, tras el despliegue del backend, en producción.

## Tareas técnicas

### 1. Confirmar y endurecer el puente multipart

- [ ] Recargar en Chromium/Brave el build actual de `.output/chrome-mv3` y repetir una creación real; verificar en logs `POST /entries/ → 201` seguido de `POST /entries/{id}/progress → 200`.
- [x] Mantener el body del content script como objeto serializable; no enviar `FormData` mediante `chrome.runtime.sendMessage`.
- [x] Reconstruir `FormData` exclusivamente en el background service worker y dejar que `fetch` genere el `Content-Type` con su boundary.
- [x] Sustituir los `any` del puente por tipos discriminados para mensajes y respuestas (`API_REQUEST`, éxito y error).
- [x] Manejar explícitamente una respuesta `undefined` de `sendMessage` y detalles FastAPI tanto string como array.

### 2. Evitar títulos falsos en adaptadores SPA

- [x] En `CrunchyrollAdapter`, priorizar metadatos específicos del episodio/serie y rechazar títulos genéricos de navegación.
- [x] No considerar una detección válida solo porque `document.title` sea no vacío; rechazar títulos genéricos y esperar el siguiente intento.
- [ ] Hacer que `detectMediaWithRetry` continúe si la detección es incompleta o de baja confianza, en vez de detenerse en el primer string genérico durante la hidratación de la SPA.
- [x] Mantener el fallback silencioso (`null`) para no mostrar overlays con datos dudosos.
- [x] Validar que MangaDex conserva `mediaType="manga"` y que los capítulos decimales se truncan con `Math.floor`, según #42.

### 3. Tratar creación y progreso como resultados distintos

- [x] Si la creación devuelve 201 pero la actualización de progreso falla, mostrar “Entrada añadida; no se pudo actualizar el progreso” en lugar de un error genérico que invite a repetir la creación.
- [ ] Evitar que un reintento posterior termine en un duplicado 409 sin explicar que la entrada ya fue creada.
- [x] Mantener `source="browser_extension"` derivado del device token en el backend.

### 4. Añadir cobertura contra regresiones

- [x] Test unitario de `BackgroundAPIClient.createEntry`: envía objeto plano y marca la petición como multipart.
- [x] Test del contrato `API_REQUEST`: reconstruye `FormData`, no establece manualmente `Content-Type` y propaga el detalle de un 422.
- [x] Tests de overlay para estos casos: creación 201 + progreso 200; creación 422; creación 201 + progreso 422.
- [x] Fixture/test de Crunchyroll con estado inicial genérico para demostrar que no se acepta `Crunchyroll Watch Popular...`.
- [x] Mantener en verde los tests de Crunchyroll, AnimeFLV y MangaDex.
- [ ] E2E en Chromium con extensión cargada, API y PostgreSQL locales: anime nuevo, manga nuevo, entrada existente y navegación SPA.

### 5. Preparar producción sin ampliar permisos de forma indiscriminada

- [x] Añadir explícitamente `https://glyphlog.qzz.io/*` a `host_permissions`; mantener prohibido `<all_urls>` según ADR-010.
- [ ] Desplegar primero migraciones y backend de #36–#42; comprobar que `POST /api/v1/devices/activate` deja de devolver 404.
- [ ] Publicar/reinstalar después el build de la extensión y emparejarlo contra `https://glyphlog.qzz.io`.
- [x] Actualizar `docs/extension-testing-guide.md`, eliminando el token debug estático y documentando la recarga obligatoria tras cada build.

## Criterios de aceptación

- ✅ Crear un anime desde Crunchyroll o AnimeFLV devuelve 201 y registra el episodio inicial.
- ✅ Crear un manga desde MangaDex devuelve 201 y registra el capítulo inicial entero.
- ✅ No se crea ninguna entrada con títulos genéricos de Crunchyroll.
- ✅ Un fallo de progreso posterior no oculta que la entrada ya fue creada ni provoca duplicados por reintento.
- ✅ Los errores 401, 409 y 422 muestran mensajes accionables en el overlay.
- ✅ Los tests unitarios de adaptadores, puente background y overlay pasan.
- ✅ El build WXT pasa y el manifest generado contiene únicamente los hosts requeridos.
- ✅ El E2E local valida el flujo `content script → background → API → service → repository → PostgreSQL`.
- ✅ Producción solo se considera lista cuando los endpoints de dispositivo están desplegados y el host está autorizado por el manifest.

## Notas técnicas

### Diagnóstico principal

La causa del `422` no está en `EntryCreateForm`: el contrato acepta `title`, `type` y `status`, y el payload equivalente fue validado con un 201. La causa de mayor confianza es un artefacto de extensión anterior a la corrección que reconstruye multipart en el background. Hay que validar el build recargado antes de añadir más cambios funcionales.

### Tradeoffs

- **Enviar JSON al backend:** descartado para este fix porque rompería el endpoint compartido multipart y ampliaría innecesariamente el cambio backend.
- **Enviar `FormData` por `sendMessage`:** descartado porque no cruza de forma fiable el límite entre content script y service worker.
- **Objeto plano + reconstrucción en background:** opción elegida; respeta structured clone y mantiene el contrato backend.
- **Aceptar cualquier `document.title`:** descartado por falsos positivos durante la hidratación SPA.
- **Usar `<all_urls>` para producción:** descartado por privacidad; se conserva la lista explícita de hosts de ADR-010.

### Orden recomendado

1. Recargar y reproducir con el build actual.
2. Añadir tests del puente multipart antes de refactorizarlo.
3. Corregir detección de título y añadir fixture SPA.
4. Mejorar el estado de éxito parcial.
5. Ejecutar E2E local.
6. Desplegar backend/migraciones y habilitar el host de producción.
