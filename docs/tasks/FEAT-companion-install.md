# [FEAT] GlyphLog Companion — instalación guiada y distribución (#67)

> **Estado:** en-progreso
> **Prioridad:** alta
> **Dependencias:** ninguna

## Contexto

Companion ya empareja con códigos efímeros, pero la instalación es zip + modo
desarrollador y la SPA no guía ni detecta la extensión. Issue
[#67](https://github.com/marmedsan6/GlyphLog/issues/67).

## Objetivo

Dejar una experiencia de instalación y emparejamiento usable desde GlyphLog,
con zip de fallback y ficha lista para CWS unlisted, sin publicar el paquete.

## Especificación

**Spec:** [`docs/specs/SPEC-companion-install.md`](../specs/SPEC-companion-install.md) — estado `aprobada`

**Contrato observable:** guía in-app en Dispositivos; detección
instalada/no emparejada/emparejada; popup con versión, API no disponible y
token revocado accionable; `/privacy` pública; zip de producción sin
localhost; nunca se pide el JWT.

## Test design

**Test design:** [`docs/test-specs/TEST-SPEC-companion-install.md`](../test-specs/TEST-SPEC-companion-install.md) — estado `aprobada`

### Matriz de automatización

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01, TC-02, TC-03, TC-10 | `apps/web/src/components/shared/device-manager.test.tsx` | componente |
| TC-04, TC-05 | `device-manager.test.tsx` | componente |
| TC-06, TC-07, TC-08 | `apps/web/src/utils/companion-extension.test.ts` + `device-manager.test.tsx` | unitario / componente |
| TC-09 | `device-manager.test.tsx` + popup copy | componente |
| TC-11, TC-12, TC-13 | `apps/extension/src/popup-status.test.ts` | unitario |
| TC-14 | `companion-extension.test.ts` | unitario |
| TC-15 | `apps/web/src/pages/privacy/privacy.page.test.tsx` | componente |
| TC-16 | inspección de `wxt.config.ts` / build prod | build |
| Recorrido HU | checklist manual local + `glyphlog.qzz.io` | manual |
| Guía visible | `apps/e2e/e2e-tests/tests/profile/companion-guide.spec.ts` | E2E |

## Decisiones de Plan mode

- **Enfoque técnico:** CWS unlisted preparado pero no publicado; zip como CTA
  mientras `VITE_COMPANION_STORE_URL` esté vacío; ID estable con `manifest.key`;
  ping `GLYPHLOG_PING` / `GLYPHLOG_CLEAR_TOKEN`; guía inline en `DeviceManager`;
  `/privacy` pública.
- **Capas afectadas:** extensión, SPA, env web, docs de Store. Sin API nueva.
- **Dependencias y orden:** SDD → clave/ping → popup → DeviceManager → privacy
  → ficha/zip → tests.
- **Riesgos y mitigaciones:** ID inestable (key RSA), CWS y localhost (hosts
  solo en build dev), Brave (smoke manual).
- **Archivos previstos:** ver sección Archivos relevantes.

## Tareas técnicas

- [x] Spec, test design y task doc.
- [x] **Red/Green** helper `pingCompanion` / `clearCompanionToken` (TC-06..08, TC-14).
- [x] **Red/Green** `DeviceManager` guía y estados (TC-01..05, TC-09, TC-10).
- [x] **Red/Green** popup: versión, API caída, 401 (TC-11..13).
- [x] **Red/Green** `/privacy` (TC-15).
- [x] ID estable, `externally_connectable`, URL API de producción (TC-16).
- [x] Ficha CWS, README de usuario.
- [x] E2E happy path de la guía + checklist manual.

## Criterios de aceptación

- ✅ Un usuario nuevo instala (zip ahora; CWS cuando exista URL), empareja y
  actualiza siguiendo solo la guía in-app.
- ✅ La guía nombra Chrome y Brave y declara Firefox/Safari no soportados.
- ✅ Permisos y datos están en lenguaje claro (guía + `/privacy`).
- ✅ Revocar deja la extensión en emparejar, recuperable.
- ✅ El popup muestra versión, guía, API no disponible y token revocado.
- ✅ Cada `RF/EC` traza a `TC` y test o checklist.
- ✅ Nunca se pide el JWT.
- ✅ No se publica en Chrome Web Store en esta issue.

## Notas técnicas

- Extension ID previsto con `manifest.key`: `boehfebkjeecahbomjhbnokjkjnippje`.
- Clave privada: `apps/extension/companion-private.pem` (gitignored). Guardar
  fuera del repo antes de publicar.
- `VITE_COMPANION_EXTENSION_ID` y `VITE_COMPANION_STORE_URL` son opcionales;
  Store vacía oculta «Añadir a Chrome». El ID tiene fallback al valor del plan
  para que la detección funcione sin env extra.

## Archivos relevantes

- `apps/extension/wxt.config.ts`
- `apps/extension/src/entrypoints/background.ts`
- `apps/extension/src/entrypoints/popup/`
- `apps/web/src/components/shared/device-manager.tsx`
- `apps/web/src/utils/companion-extension.ts`
- `apps/web/src/pages/privacy/privacy.page.tsx`
- `docs/store/companion-chrome-web-store.md`
