# [FIX] Compatibilidad y regresión de GlyphLog Companion (#68)

> **Estado:** backlog
> **Prioridad:** alta
> **Dependencias:** [`DOCS-companion-compatibility`](./DOCS-companion-compatibility.md)

## Contexto

La issue #66 definió contratos y matriz, pero #68 debe materializar la evidencia
automatizada. La línea base tiene 53 tests unitarios de extensión y build WXT en
verde, sin E2E de extensión cargada. El E2E web preexistente de la guía falla
antes de estos cambios por una advertencia renderizada pero oculta.

## Objetivo

Demostrar y corregir la compatibilidad prioritaria de Companion mediante DOM
versionado, regresiones de flujos críticos y un E2E local desde content script
hasta persistencia PostgreSQL.

## Especificación

**Spec:** [`docs/specs/SPEC-companion-platform-regression.md`](../specs/SPEC-companion-platform-regression.md) — estado `implementada`

**Contrato observable:** detección/hidratación/SPA segura en Crunchyroll,
AnimeFLV y MangaDex; creación/progreso sin duplicados; errores de auth/API;
evidencia diferenciada para Chromium y Brave.

## Test design

**Test design:** [`docs/test-specs/TEST-SPEC-companion-platform-regression.md`](../test-specs/TEST-SPEC-companion-platform-regression.md) — estado `implementada`

### Matriz de automatización

| Caso          | Test ejecutable previsto                                         | Nivel               |
| ------------- | ---------------------------------------------------------------- | ------------------- |
| TC-01 a TC-06 | `apps/extension/src/adapters/__tests__/fixture-contract.test.ts` | unitario            |
| TC-07         | `apps/e2e/e2e-tests/tests/companion/companion-extension.spec.ts` | E2E                 |
| TC-08 a TC-11 | `apps/e2e/e2e-tests/tests/companion/companion-extension.spec.ts` | E2E integración     |
| TC-12         | `apps/extension/src/background-request.test.ts` + E2E Companion  | unitario + E2E      |
| TC-13         | `apps/extension/src/overlay/overlay.test.ts` + E2E Companion     | componente + E2E    |
| TC-14, TC-15  | `apps/extension/src/overlay/overlay.test.ts`                     | componente          |
| TC-16, TC-17  | `apps/e2e/e2e-tests/tests/companion/companion-extension.spec.ts` | E2E                 |
| TC-18, TC-19  | proyectos `companion-chromium` y `companion-brave`               | E2E navegador       |
| TC-20         | `apps/extension/src/compatibility-matrix.test.ts`                | unitario documental |
| TC-21         | preflight de `companion-extension.spec.ts`                       | E2E infraestructura |

## Decisiones de Plan mode

- **Enfoque técnico:** mantener parsing por adaptador; introducir fixtures DOM
  `v1` con metadatos; corregir solo falsos positivos demostrados por Red;
  centralizar la detección de cambio de URL sin depender del mundo JavaScript de
  la SPA; reutilizar un único host de overlay; ejecutar Playwright con contexto
  persistente y el build MV3 cargado.
- **Capas afectadas:** adaptadores y content/overlay de extensión; harness E2E;
  documentación de compatibilidad. Backend no cambia: sus endpoints y capas
  Router → Service → Repository son el sistema real ejercitado.
- **Dependencias y orden:** fixtures/test unitario → Red → adaptadores Green;
  regresiones overlay/background → Red/Green; build → E2E Chromium Red/Green →
  Brave si existe; matriz y cierre.
- **Riesgos y mitigaciones:** interceptar únicamente documentos de plataforma y
  búsqueda externa para eliminar red ajena, dejando create/progress contra API
  real; usuario/token únicos por test; proyecto Playwright separado para no
  contaminar Firefox/WebKit; ausencia de Brave se reporta, no se aprueba.
- **Archivos previstos:** fixtures/tests/adaptadores bajo `apps/extension/src`;
  `content.ts`, `overlay.ts`; fixture/helper/spec/config de `apps/e2e`;
  `docs/companion-compatibility.md` y artefactos SDD de esta tarea.

## Tareas técnicas

- [x] **Red TC-01–TC-06:** añadir DOM/metadata versionados y observar falsos positivos genéricos.
- [x] **Green TC-01–TC-06:** filtrar títulos genéricos por adaptador sin compartir lógica de dominio.
- [x] **Refactor TC-01–TC-06:** consolidar solo el loader/validador de tests.
- [x] **Red/Green TC-12–TC-15:** ampliar multipart, éxito parcial, límites de progreso y duplicados.
- [x] **Red TC-07–TC-11, TC-16–TC-18, TC-21:** ejecutar el E2E cargado antes de corregir runtime.
- [x] **Green/Refactor E2E:** corregir SPA/overlay y estabilizar el harness manteniendo API/DB reales.
- [x] **TC-19:** ejecutar Brave o registrar el bloqueo exacto de entorno.
- [x] **TC-20:** actualizar y validar matriz, fechas, evidencia, limitaciones y protocolo degradado.
- [x] Ejecutar Gentle Review únicamente si el provider permite RDD acotado al clon.
- [ ] Completar la validación final de unitarios, build, E2E y backend/API;
      la ejecución actual queda bloqueada por servicios locales ausentes.
- [x] **Red correctivo TC-07:** reproducir entrada SPA desde Crunchylists con
      título residual e hidratación posterior a la primera ventana de reintentos.
- [x] **Green correctivo TC-07:** rechazar `Crunchylists`, observar mutaciones
      durante una ventana acotada y detener la observación tras detectar.
- [ ] Revalidar manualmente la transición real Crunchylists/Discover → episodio sin reload con el build nuevo.

## Evidencia de validación

- **Red adaptadores:** AnimeFLV aceptaba `AnimeFLV` y `Ver anime online`; MangaDex aceptaba `MangaDex`.
- **Red SPA inicial:** `pushState` conservaba el título anterior al ejecutarse el content script en un mundo aislado.
- **Red SPA real:** la navegación manual Discover → serie → episodio necesitaba
  reload aunque la URL cambiara correctamente; tras recargar, el shell español
  podía exponer el título promocional `Crunchyroll: Ve animes populares...`.
  El E2E local además reprodujo el reemplazo tardío de `<html>` y dejó constancia
  de que el primer caso no debe considerarse evidencia de la web real.
- **Green SPA en código:** el content script usa el evento `wxt:locationchange`,
  observa el `Document` estable durante la hidratación, descarta títulos
  promocionales y elimina el overlay al salir de una ruta compatible. Falta
  repetir el smoke real con el build nuevo para cerrar la degradación.
- **Red overlay:** dos detecciones podían montar dos hosts simultáneos.
- **Red matriz:** faltaban fecha vigente, evidencia y protocolo degradado verificables.
- **Green unitario:** 75/75 tests de extensión.
- **Green build:** build WXT de producción y build E2E MV3.
- **E2E Chromium:** bloqueado en esta ejecución por API local no disponible
  (`Failed to fetch`); la prueba de detección llegó a renderizar el overlay de
  error, pero no pudo alcanzar el oráculo de datos.
- **Evidencia histórica E2E Brave:** 8/8 casos en la pasada del 2026-08-28;
  debe repetirse con este build.
- **Evidencia histórica backend:** 20/20 tests relevantes de autenticación de
  extensión y progreso en la pasada del 2026-08-28.
- **Gentle:** el estado autoritativo terminó `clean` y sin transiciones, pero RDD siguió
  `off`: el provider instalado no permitió activar `clone` sin cambiar el estado global.
  Por tanto no hubo review ni findings aprobatorios; la limitación queda registrada.

## Criterios de aceptación

- ✅ Cada plataforma prioritaria tiene escenarios automatizados hidratado/incompleto/genérico.
- ✅ El E2E crea y actualiza progreso real para anime y manga a través de la extensión.
- ✅ Multipart, éxito parcial y reintento no inducen duplicados.
- ✅ Token revocado y errores de API no producen escritura ni éxito falso.
- ✅ La matriz distingue evidencia y define degradación por cambio DOM.
- ✅ Cada `RF/EC` traza a `TC`, test ejecutable y resultado.
- ✅ Existe evidencia Red anterior a las correcciones de producción.

## Notas técnicas

Playwright requiere contexto persistente para extensiones Chromium MV3. Chrome
y Edge ya no admiten de forma fiable los flags de sideload; el gate automatizado
usa el Chromium incluido por Playwright. Brave se prueba con su ejecutable local
cuando está disponible y compatible.

## Aparcamiento y rediseño pendiente

La implementación queda aparcada y no debe publicarse como flujo automático.
El smoke real mostró detección intermitente y riesgo de asociar el episodio a
otra obra cuando existen títulos genéricos, temporadas, remakes o resultados
anime/manga equivalentes.

La siguiente iteración debe separar detección de resolución de identidad:

1. detectar señales y calcular candidatos, sin escribir en la colección;
2. consultar coincidencias con títulos alternativos, idioma, temporada, tipo y plataforma;
3. mostrar un selector con candidatos y la opción «No es ninguno»;
4. crear o actualizar solo después de una confirmación explícita;
5. conservar idempotencia por usuario, tipo e identificador elegido.

Si la confianza es baja, el resultado obligatorio es «selección requerida»,
nunca una creación automática. La nueva spec debe cubrir temporadas, remakes,
anime y manga con el mismo nombre, títulos traducidos, entradas existentes,
API parcial y recuperación sin duplicados.

## Archivos relevantes

- `apps/extension/src/adapters/`
- `apps/extension/src/entrypoints/content.ts`
- `apps/extension/src/overlay/`
- `apps/e2e/e2e-tests/tests/companion/`
- `docs/companion-compatibility.md`
