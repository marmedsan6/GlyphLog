# [SPEC] GlyphLog Companion — instalación guiada y distribución

> **Estado:** aprobada
> **Prioridad:** alta
> **Dependencias:** ninguna; reutiliza el emparejamiento existente y la política de #66
> **Test design derivado:** [`docs/test-specs/TEST-SPEC-companion-install.md`](../test-specs/TEST-SPEC-companion-install.md)
> **Task derivado:** [`docs/tasks/FEAT-companion-install.md`](../tasks/FEAT-companion-install.md)

## Contexto

GlyphLog Companion ya empareja con códigos efímeros de 6 caracteres y tokens
revocables, pero la instalación es un zip más «Cargar descomprimida». El perfil
solo ofrece un botón de descarga. El popup no muestra versión, no distingue un
fallo de red de un token revocado y la SPA no sabe si la extensión está
instalada. Un usuario nuevo no puede completar instalar → emparejar → actualizar
progreso siguiendo solo la interfaz.

## Objetivo

Ofrecer una instalación y emparejamiento guiados desde GlyphLog, con zip de
fallback, estados recuperables y una ficha lista para Chrome Web Store unlisted,
sin publicar el paquete en esta entrega.

## Requisitos funcionales

- **RF-1 — Guía in-app:** Como usuario, quiero una guía corta en Perfil →
  Dispositivos con requisitos, instalación, emparejamiento, permisos,
  actualización, revocación y problemas frecuentes, para no depender del
  repositorio.
- **RF-2 — Navegadores declarados:** Como usuario, quiero que la guía nombre
  Chrome y Brave, acepte Edge Chromium como compatible y declare Firefox y
  Safari como no soportados, para no instalar en un navegador inútil.
- **RF-3 — Canal de instalación:** Como usuario, quiero un botón «Añadir a
  Chrome» cuando exista URL de Chrome Web Store y, si no, descargar el zip con
  los pasos de carga descomprimida, para poder instalar sin buscar fuera.
- **RF-4 — Detección de instalación:** Como usuario autenticado, quiero que
  Dispositivos distinga «no instalada», «instalada y no emparejada» e
  «instalada y emparejada», para ver el siguiente paso correcto.
- **RF-5 — Emparejamiento sin JWT:** Como usuario, quiero emparejar solo con el
  código de 6 caracteres generado en GlyphLog, para no copiar el JWT de la SPA.
- **RF-6 — Permisos en lenguaje claro:** Como usuario, quiero saber qué datos
  trata Companion y a qué sitios accede, para decidir si la instalo.
- **RF-7 — Versión visible:** Como usuario de la extensión, quiero ver la
  versión instalada y un enlace a la guía, para saber qué tengo y cómo seguir.
- **RF-8 — API no disponible:** Como usuario de la extensión, quiero un aviso
  accionable si GlyphLog no responde, no un error técnico de red.
- **RF-9 — Token revocado o caducado:** Como usuario, quiero que el popup vuelva
  a emparejar con instrucciones claras cuando el dispositivo ya no tenga acceso.
- **RF-10 — Revocación recuperable:** Como usuario, quiero que al revocar el
  dispositivo en el perfil la extensión deje de usar el token y muestre cómo
  volver a emparejar.
- **RF-11 — Política de privacidad:** Como visitante, quiero una página pública
  que explique el tratamiento de Companion, para cumplir el requisito de la
  Store y consultar mis datos.
- **RF-12 — Paquete de distribución:** Como mantenedor, quiero un zip de
  producción con identidad visible, API de producción por defecto y sin pedir
  localhost, para poder subirlo después como unlisted.

## API contract

No se añaden endpoints. Siguen vigentes:

| Método | Ruta | Auth | Uso |
| ------ | ---- | ---- | --- |
| `POST` | `/api/v1/devices/pair` | JWT | Generar código de 6 caracteres (TTL 5 min) |
| `POST` | `/api/v1/devices/activate` | ninguna (el código) | Entregar `device_token` una vez |
| `GET` | `/api/v1/devices/` | JWT | Listar dispositivos activos |
| `DELETE` | `/api/v1/devices/{device_id}` | JWT | Revocar; siguientes llamadas 401 |
| `GET` | `/health` | ninguna | Comprobar si la API responde |

Errores de activate/pair/revoke no cambian. Un 401 de device token significa
acceso revocado o caducado. Un fallo de red no es un 401.

### Contrato SPA ↔ extensión (no HTTP)

La SPA puede enviar a Companion, si está instalada:

| Tipo | Respuesta esperada |
| ---- | ------------------ |
| `GLYPHLOG_PING` | `{ version: string, paired: boolean }` |
| `GLYPHLOG_CLEAR_TOKEN` | `{ ok: true }` y el token local queda borrado |

Si el navegador no puede entregar el mensaje, Companion se considera no
instalada. `paired` es verdadero solo cuando hay un token de dispositivo
guardado en el navegador.

## Schemas Pydantic

N/A. No se crean ni modifican schemas.

## Data models

N/A. No hay cambios de tablas, columnas, relaciones ni migraciones.

## Edge cases

- **EC-1 — Sin Chrome Web Store:** si no hay URL de Store configurada, no se
  muestra «Añadir a Chrome» y el CTA es el zip con pasos de modo desarrollador.
- **EC-2 — Ping imposible:** si no existe `chrome.runtime`, el mensaje falla o
  no hay respuesta, Dispositivos muestra el estado no instalada.
- **EC-3 — Código caducado:** el usuario ve el error de código expirado y la
  guía indica generar uno nuevo; no se pide el JWT.
- **EC-4 — API inalcanzable:** el popup muestra el aviso de API no disponible
  con reintentar y acceso a la URL de la API; no muestra «Failed to fetch».
- **EC-5 — Token revocado en la SPA:** revocar borra el token local de la
  extensión si está instalada; el popup pasa a emparejar aunque estuviera
  abierto.
- **EC-6 — Extensión emparejada y lista vacía:** si el ping dice emparejada,
  Dispositivos no trata al usuario como «no instalada» aunque la lista API esté
  vacía.
- **EC-7 — Navegador no soportado:** Firefox y Safari aparecen como no
  soportados en la guía aunque el usuario abra el perfil ahí.
- **EC-8 — Build de distribución:** el paquete de producción usa la API
  `https://glyphlog.qzz.io` por defecto y no declara `http://localhost:8000/*`
  como host permitido.

## Fuera de alcance

- ❌ Publicar el paquete en Chrome Web Store ni pagar la cuenta de desarrollador.
- ❌ Firefox, Safari o Edge como target oficial de pruebas.
- ❌ Endpoint de compatibilidad de versión API ↔ extensión.
- ❌ Página de producto `/companion`.
- ❌ Nuevos adaptadores o el trabajo de fixtures/E2E de la issue #68.
- ❌ Que «Desvincular» en el popup revoque el dispositivo en el servidor.

## Criterios de salida

- [x] API contract completo: se reutilizan endpoints existentes y el contrato SPA ↔ extensión está definido.
- [x] Schemas Pydantic: N/A justificado.
- [x] Data models: N/A justificado.
- [x] Edge cases enumerados y convertibles en tests.
- [x] Sin implementación ni detalles de plan.
- [x] Requisitos y edge cases tienen identificadores estables `RF-*`/`EC-*`.
- [x] El test design `TC-*` puede escribirse solo leyendo esta spec.
- [x] No contiene archivos, clases, mocks ni decisiones propias de Plan mode.
