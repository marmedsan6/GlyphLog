# [SPEC] Suite de Acceptance Tests E2E para GlyphLog

> **Estado:** implementada
> **Prioridad:** alta
> **Dependencias:** ninguna
> **Plan/Task derivado:** `docs/tasks/TEST-e2e-acceptance-tests.md` (tarea paraguas; un task doc por flujo RF-0..RF-7)

## Contexto

GlyphLog tiene una suite E2E (`apps/e2e`) construida con Playwright + Page Object Model (POM). Hoy contiene ~28 *smoke tests* superficiales: verifican que elementos visibles existen (headings, botones, inputs) y un par de flujos felices (login, registro, crear entrada anime/juego, entrar/salir de edición de perfil, toggle de tema).

Lo que **no** cubre son los flujos de negocio reales del producto, que sí están implementados y en producción:

- Colección: filtros por tipo, búsqueda global, ordenamiento, paginación, estado vacío.
- Detalle de entrada (`/entries/:id`): ver, editar, eliminar (no existe ni page-object).
- Progreso: configurar, actualizar con modal, reiniciar con confirmación.
- Perfil completo: guardar username/bio, subir/eliminar avatar, gestión de dispositivos.
- Logout (el método `AppLayout.clickLogout()` existe pero no se usa en ningún test).
- Integraciones: importar lista (MAL/AniList/Kitsu/Steam), recomendaciones, GlyphAI (chat).

Además se detectó un **bug bloqueante**: el helper de autenticación E2E (`auth-helper.ts`) escribe el token en `localStorage` con clave `'token'`, pero el frontend real lo lee desde `sessionStorage` con clave `glyphlog_access_token` (`apps/web/src/lib/auth-token.ts`). Esto significa que los tests de páginas protegidas **no autentican correctamente** o dependen de un comportamiento que ya no existe.

El objetivo de esta spec es transformar los smoke tests en una suite de **acceptance tests** que valide los flujos de negocio principales de GlyphLog contra el backend real, y corregir el bug de autenticación como prerequisito.

## Objetivo

Ampliar la suite E2E de Playwright para que cubra el *happy path* de los flujos de negocio principales de GlyphLog (colección, detalle, progreso, perfil, importación, recomendaciones y GlyphAI), corrigiendo previamente el helper de autenticación.

En una segunda iteración (RF-8..RF-11) se amplió la cobertura a los flujos de progreso rápido/inline, historial y reset de progreso, búsqueda global y paginación, con criterios de aceptación extraídos de las HUs del GitHub Project #2.

## Requisitos funcionales

Los requisitos se agrupan por flujo. Cada uno se desglosará en un task doc derivado tras aprobar esta spec.

### RF-0 — Prerequisito: autenticación E2E correcta

- **RF-0.1** — Como desarrollador, quiero que el helper `createTestUserAndLogin` persista el token en `sessionStorage` con la clave `glyphlog_access_token` para que los tests de páginas protegidas autentiquen igual que la app real.
- **RF-0.2** — Como desarrollador, quiero que el helper devuelva el token y registre un usuario único (email con timestamp) vía `POST /api/v1/auth/register` para aislar los tests entre sí.

### RF-1 — Colección

- **RF-1.1** — Como usuario autenticado sin entradas, quiero ver el estado vacío ("Aún no tienes entradas en tu colección") con un botón "Crear primera entrada" para empezar mi colección.
- **RF-1.2** — Como usuario autenticado con entradas, quiero ver la lista de mis entradas con su contador para confirmar que se cargan desde el backend.
- **RF-1.3** — Como usuario, quiero filtrar la colección por tipo (Todos / Anime / Manga / Juegos) para acotar lo que veo.
- **RF-1.4** — Como usuario, quiero ordenar la colección por un criterio seleccionable para navegar mi catálogo.
- **RF-1.5** — Como usuario, quiero buscar dentro de mi colección y limpiar la búsqueda para localizar una entrada concreta.
- **RF-1.6** — Como usuario con más de una página de entradas, quiero paginar para ver el resto de la colección.

### RF-2 — Detalle y eliminación de entrada

- **RF-2.1** — Como usuario, quiero navegar a una entrada y ver su detalle para consultar su información.
- **RF-2.2** — Como usuario, quiero editar una entrada desde su detalle y ver los cambios reflejados.
- **RF-2.3** — Como usuario, quiero eliminar una entrada mediante un diálogo de confirmación y ser redirigido a la colección para quitarla de mi catálogo.

### RF-3 — Progreso

- **RF-3.1** — Como usuario, quiero configurar el total de progreso al crear una entrada para registrar su extensión.
- **RF-3.2** — Como usuario, quiero actualizar el progreso de una entrada desde su detalle mediante un modal y ver el nuevo valor reflejado.

### RF-4 — Perfil y sesión

- **RF-4.1** — Como usuario, quiero editar y guardar mi username y bio para personalizar mi perfil público.
- **RF-4.2** — Como usuario, quiero cerrar sesión y ser redirigido a `/login` para salir de mi cuenta.
- **RF-4.3** — Como usuario, quiero ver la sección de dispositivos en mi perfil para gestionar sesiones de la extensión.

### RF-5 — Importación de listas

- **RF-5.1** — Como usuario, quiero completar el wizard de importación (seleccionar fuente → pegar contenido → preview → confirmar) para importar entradas a mi colección.
- **RF-5.2** — Como usuario, quiero ver un preview de las entradas parseadas antes de confirmar la importación para revisar el resultado.

### RF-6 — Recomendaciones

- **RF-6.1** — Como usuario, quiero generar recomendaciones personalizadas y ver las tarjetas de resultado para descubrir nuevo contenido.

### RF-7 — GlyphAI (chat)

- **RF-7.1** — Como usuario, quiero abrir GlyphAI, enviar un mensaje y ver la respuesta del asistente para interactuar con la IA.

### RF-8 — Progreso rápido desde la tarjeta (quick progress)

> Origen: HUs del GitHub Project #2 — issues #34 (acciones rápidas) y #39 (edición inline desde EntryCard).

- **RF-8.1** — Como usuario, quiero incrementar el progreso de una entrada desde su tarjeta con un botón rápido (`+1 ep`/`+1 cap`/`+0.5h`) para actualizarla sin abrir el detalle.
- **RF-8.2** — Como usuario, quiero que al alcanzar el total con el botón rápido aparezca el diálogo "¿Completar entrada?" y, al confirmar, la entrada pase a estado "Completado".
- **RF-8.3** — Como usuario, quiero editar el progreso inline (texto clicable → input numérico, `Enter` confirma) para fijar un valor concreto desde la colección.
- **RF-8.4** — Como usuario, quiero que un valor inline superior al total sea rechazado con un mensaje de validación ("El valor no puede superar N").

### RF-9 — Historial y reset de progreso

> Origen: HUs del GitHub Project #2 — issues #33 (actualización manual), #35 (historial) y protección de reinicio del `entry_service`.

- **RF-9.1** — Como usuario, quiero que una entrada sin historial NO muestre la sección "Historial de progreso" en su detalle.
- **RF-9.2** — Como usuario, quiero ver el timeline con al menos un evento tras actualizar el progreso de una entrada.
- **RF-9.3** — Como usuario con una entrada con historial, al intentar cambiar su tipo el sistema debe pedirme confirmar el reinicio ("Reiniciar progreso"); al confirmar, el tipo cambia y el progreso se reinicia.

### RF-10 — Búsqueda global (header)

> Origen: HU del GitHub Project #2 — issue #21 (barra de búsqueda global).

- **RF-10.1** — Como usuario, quiero escribir en la barra del header y pulsar Enter para navegar a `/collection?search=<query>` con solo las coincidencias.
- **RF-10.2** — Como usuario, quiero usar "Ver todos los resultados para..." del dropdown para navegar a la colección filtrada.
- **RF-10.3** — Como usuario, quiero limpiar la búsqueda desde el header para volver a ver la colección completa.

### RF-11 — Paginación de colección

> Origen: HU del GitHub Project #2 — issue #8 (listar entradas): "hay controles de paginación cuando hay más de 15 entradas".

- **RF-11.1** — Como usuario con más de 15 entradas, quiero ver controles de paginación y navegar entre páginas (Siguiente/Anterior) sin perder el contador total.

## API contract

Los tests E2E usan el frontend (`http://localhost:5173`) con proxy Vite a la API (`http://localhost:8000`, ruta `/api`). La interacción principal es a nivel de UI, no de API directa. No obstante, estos tests dependen de los siguientes contratos de API ya existentes (sin cambios en esta spec):

| Endpoint | Método | Uso en tests |
| -------- | ------ | ------------ |
| `/api/v1/auth/register` | POST | Crear usuario único de test (prerequisito RF-0) |
| `/api/v1/auth/login` | POST | Login por UI con credenciales reales |
| `/api/v1/entries/` | GET | Listar colección (filtros, búsqueda, orden, paginación) |
| `/api/v1/entries/` | POST | Crear entrada con progreso |
| `/api/v1/entries/{id}` | GET | Cargar detalle |
| `/api/v1/entries/{id}` | PUT | Editar entrada |
| `/api/v1/entries/{id}` | DELETE | Eliminar entrada |
| `/api/v1/entries/{id}/progress` | POST | Actualizar progreso |
| `/api/v1/users/me` | GET/PATCH | Leer y actualizar perfil |
| `/api/v1/import/parse` | POST | Parsear lista (mockeado en E2E) |
| `/api/v1/import/execute` | POST | Ejecutar importación (mockeado en E2E) |
| `/api/v1/recommendations/generate` | POST | Generar recomendaciones (mockeado en E2E) |
| `/api/v1/chat` | POST | Chat GlyphAI (mockeado en E2E) |

> Los endpoints de LLM (`import/parse`, `import/execute`, `recommendations/generate`, `ai/chat`) se **mockean** mediante `page.route()` en los tests E2E (ver sección "Estrategia de mock del LLM").

### Estrategia de mock del LLM

Los flujos RF-5, RF-6 y RF-7 dependen de Claude/Bedrock (externo, costoso, lento 30-60s, no determinista). Para los acceptance tests se interceptan las respuestas del LLM con `page.route()`:

- **Import**: mockear `POST **/parse-import` y `POST **/execute-import` con un fixture JSON de entradas parseadas y un resultado de importación.
- **Recomendaciones**: mockear `POST **/recommendations/generate` con un fixture de recomendaciones.
- **Chat**: mockear `POST **/chat` con una respuesta de asistente de streaming (o síncrona según el contrato real).

El resto de llamadas (`auth`, `entries`, `users`) van contra el backend real (BD de test). Los mocks se definen por test para no contaminar otros flujos.

## Schemas Pydantic

No se definen schemas nuevos. Los tests consumen los schemas existentes (`EntryResponse`, `PaginatedEntryResponse`, `UserProfile`, etc.). Los fixtures de mock del LLM deben respetar la forma de los schemas reales para que el frontend los renderice correctamente:

- Mock de parse-import → devuelve la forma de `ParseImportResponse` (lista `entries` + `warnings`).
- Mock de execute-import → devuelve la forma de `ExecuteImportResponse` (`created`, `skipped`, `errors`).
- Mock de recomendaciones → devuelve la forma de `GenerateRecommendationsResponse` (`recommendations` + `metadata`).
- Mock de chat → devuelve la forma del stream de `AIChatMessage`.

## Data models

Sin cambios en el modelo de datos. Los tests crean datos efímeros (usuarios y entradas únicos con timestamp) en la BD de test real; no se añaden tablas ni migraciones.

## Edge cases

Cada uno debe poder convertirse en test. Dado que el alcance es *happy path*, se listan solo los casos límite esenciales:

- [ ] Usuario recién registrado → colección vacía con estado vacío visible (RF-1.1).
- [ ] Colección con entradas de un solo tipo → el filtro por ese tipo las muestra y el resto las oculta (RF-1.3).
- [ ] Búsqueda sin coincidencias → no rompe el render (lista vacía o estado acorde) (RF-1.5).
- [ ] Progreso alcanzando el total → aparece prompt "¿Completar entrada?" (RF-3.2, RF-8.2).
- [ ] Eliminación cancelada → la entrada se conserva (RF-2.3).
- [ ] Incremento rápido alcanza el total → diálogo de completado (RF-8.2).
- [ ] Valor inline superior al total → mensaje "El valor no puede superar N" (RF-8.4).
- [ ] Entrada sin historial → timeline ausente (RF-9.1).
- [ ] Cambio de tipo con historial → diálogo de reinicio, y al confirmar se aplica el cambio (RF-9.3).
- [ ] Colección con >15 entradas → paginación visible y navegable (RF-11).

## Fuera de alcance

- ❌ Tests de error/validación exhaustivos (422, 401, conflictos de progreso): el alcance es happy path. Los errores ya se cubren en unit/integration tests del backend y frontend.
- ❌ Cross-browser completo en CI: solo Chromium en CI; firefox/webkit se ejecutan en local.
- ❌ Google OAuth en E2E: requiere credenciales reales de Google y un flujo externo; se deja fuera.
- ❌ Pruebas de rendimiento, accesibilidad o seguridad.
- ❌ Refactorización profunda de la suite existente más allá del helper de auth y los page-objects necesarios.
- ❌ Deploy ni infraestructura de CI/CD nueva (si la hubiera, sería task aparte).

## Criterios de salida

- [ ] Los 12 flujos (RF-0 a RF-11) están especificados a nivel de comportamiento con su happy path claro.
- [ ] La estrategia de mock del LLM queda definida para import, recomendaciones y chat.
- [ ] El bug del token (sessionStorage + clave `glyphlog_access_token`) queda identificado como prerequisito RF-0.
- [ ] Edge cases enumerados y convertibles en tests.
- [ ] Sin implementación ni detalles de plan (los "cómo" van al plan, no a la spec).
- [ ] Los tests de aceptación pueden escribirse solo leyendo esta spec (rutas, textos y acciones descritos).
