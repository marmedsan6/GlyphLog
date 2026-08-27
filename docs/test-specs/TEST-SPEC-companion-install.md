# [TEST-SPEC] GlyphLog Companion — instalación guiada y distribución

> **Estado:** aprobada
> **Tier:** 3
> **Spec origen:** [`docs/specs/SPEC-companion-install.md`](../specs/SPEC-companion-install.md)
> **Task derivado:** [`docs/tasks/FEAT-companion-install.md`](../tasks/FEAT-companion-install.md)

## Alcance observable

Se verifica la guía in-app, la detección instalada/no emparejada, los avisos del
popup, la versión visible, la privacidad pública, el zip de fallback y que nunca
se pida el JWT. Queda fuera publicar en la Store, adaptar Firefox/Safari y el
E2E de adaptadores de la issue #68.

El recorrido zip → emparejar → actualizar progreso contra API local y
desplegada es checklist manual (criterio de la HU), no un caso automatizado
que cargue la extensión.

## Matriz de trazabilidad

| Origen | Casos | Cobertura esperada |
| ------ | ----- | ------------------ |
| RF-1   | TC-01, TC-02 | Guía visible en Dispositivos |
| RF-2   | TC-03 | Chrome/Brave y no soportados |
| RF-3, EC-1 | TC-04, TC-05 | CTA Store vs zip |
| RF-4, EC-2, EC-6 | TC-06, TC-07, TC-08 | Tres estados de detección |
| RF-5, EC-3 | TC-09 | Emparejamiento solo con código |
| RF-6   | TC-10 | Permisos en lenguaje claro |
| RF-7   | TC-11 | Versión y enlace a la guía |
| RF-8, EC-4 | TC-12 | API no disponible |
| RF-9   | TC-13 | Token revocado/caducado |
| RF-10, EC-5 | TC-14 | Revocación limpia el token local |
| RF-11  | TC-15 | Página pública de privacidad |
| RF-12, EC-8 | TC-16 | Paquete de producción |
| EC-7   | TC-03 | Firefox/Safari no soportados |

## Casos de prueba

### TC-01 — La guía aparece en Dispositivos

- **Origen:** RF-1
- **Prioridad:** P0
- **Precondiciones:** usuario autenticado en `/profile`.
- **Dado:** la sección Dispositivos.
- **Cuando:** se muestra la página.
- **Entonces:** hay una guía con instalación, emparejamiento, actualización,
  revocación y problemas frecuentes.

### TC-02 — La guía cubre el flujo completo sin salir de GlyphLog

- **Origen:** RF-1
- **Prioridad:** P0
- **Precondiciones:** guía visible.
- **Dado:** un usuario nuevo.
- **Cuando:** lee la guía.
- **Entonces:** los pasos bastan para instalar, generar código, pegarlo en el
  popup y actualizar una entrada; no hay instrucciones de copiar un JWT.

### TC-03 — Navegadores soportados y no soportados

- **Origen:** RF-2, EC-7
- **Prioridad:** P0
- **Precondiciones:** guía visible.
- **Dado:** el texto de requisitos.
- **Cuando:** el usuario lo lee.
- **Entonces:** nombra Chrome y Brave, menciona Edge Chromium y declara Firefox
  y Safari como no soportados.

### TC-04 — Sin URL de Store el CTA es el zip

- **Origen:** RF-3, EC-1
- **Prioridad:** P0
- **Precondiciones:** no hay URL de Chrome Web Store configurada.
- **Dado:** el estado no instalada.
- **Cuando:** se muestra Dispositivos.
- **Entonces:** no aparece «Añadir a Chrome» y sí un control para descargar el
  zip con pasos de carga descomprimida.

### TC-05 — Con URL de Store aparece «Añadir a Chrome»

- **Origen:** RF-3
- **Prioridad:** P1
- **Precondiciones:** hay URL de Store configurada.
- **Dado:** el estado no instalada.
- **Cuando:** se muestra Dispositivos.
- **Entonces:** aparece un enlace o botón «Añadir a Chrome» hacia esa URL y el
  zip permanece como fallback.

### TC-06 — No instalada cuando el ping no es posible

- **Origen:** RF-4, EC-2
- **Prioridad:** P0
- **Precondiciones:** no hay extensión, no hay `chrome.runtime`, o el mensaje
  externo falla.
- **Dado:** el usuario abre Dispositivos.
- **Cuando:** se consulta Companion.
- **Entonces:** el estado es no instalada y se muestran los pasos de instalación.

### TC-07 — Instalada y no emparejada

- **Origen:** RF-4
- **Prioridad:** P0
- **Precondiciones:** el ping responde con `paired: false`.
- **Dado:** Dispositivos.
- **Cuando:** llega la respuesta.
- **Entonces:** no se pide reinstalar; se ofrece emparejar con el código de 6
  caracteres.

### TC-08 — Instalada y emparejada

- **Origen:** RF-4, EC-6
- **Prioridad:** P0
- **Precondiciones:** el ping responde con `paired: true`.
- **Dado:** la lista de dispositivos de la API puede estar vacía.
- **Cuando:** se muestra Dispositivos.
- **Entonces:** no se trata como no instalada; se muestra la gestión de
  dispositivos y un acceso a actualizar o desinstalar.

### TC-09 — Nunca se pide el JWT

- **Origen:** RF-5, EC-3
- **Prioridad:** P0
- **Precondiciones:** guía, popup de emparejamiento o código caducado.
- **Dado:** cualquier copy de instalación o emparejamiento.
- **Cuando:** el usuario sigue el flujo o ve un código expirado.
- **Entonces:** las instrucciones piden un código de 6 caracteres generado en
  GlyphLog y no el token de sesión de la SPA.

### TC-10 — Permisos y datos en lenguaje claro

- **Origen:** RF-6
- **Prioridad:** P0
- **Precondiciones:** guía visible.
- **Dado:** la sección de permisos.
- **Cuando:** el usuario la lee.
- **Entonces:** explica token de dispositivo, API de GlyphLog, lectura de
  Crunchyroll/AnimeFLV/MangaDex y que no ve el resto de la navegación.

### TC-11 — Versión y guía en el popup

- **Origen:** RF-7
- **Prioridad:** P0
- **Precondiciones:** el popup está abierto.
- **Dado:** cualquier pantalla del popup.
- **Cuando:** el usuario mira el pie.
- **Entonces:** aparece la versión instalada y un enlace a la guía de GlyphLog.

### TC-12 — Aviso de API no disponible

- **Origen:** RF-8, EC-4
- **Prioridad:** P0
- **Precondiciones:** hay token local y la API no responde por red.
- **Dado:** el popup intenta listar entradas o contactar la API.
- **Cuando:** la petición falla por red.
- **Entonces:** se muestra un aviso de que no se puede contactar con GlyphLog,
  con reintentar y acceso a la URL de la API, sin el texto «Failed to fetch».

### TC-13 — Token revocado o caducado

- **Origen:** RF-9
- **Prioridad:** P0
- **Precondiciones:** el token local ya no es válido.
- **Dado:** el popup hace una petición autenticada.
- **Cuando:** la API responde 401.
- **Entonces:** vuelve a emparejar e indica generar un código nuevo en Perfil →
  Dispositivos.

### TC-14 — Revocar en la SPA limpia la extensión

- **Origen:** RF-10, EC-5
- **Prioridad:** P0
- **Precondiciones:** Companion instalada y emparejada.
- **Dado:** el usuario confirma Revocar en Dispositivos.
- **Cuando:** la revocación termina.
- **Entonces:** se pide a la extensión que borre el token local; el siguiente
  estado del popup es emparejar.

### TC-15 — Privacidad pública

- **Origen:** RF-11
- **Prioridad:** P0
- **Precondiciones:** ninguna sesión.
- **Dado:** la ruta pública de privacidad.
- **Cuando:** un visitante la abre.
- **Entonces:** explica código de emparejamiento, token de dispositivo, progreso
  enviado, almacenamiento local, hosts, caducidad de 90 días, revocación y que
  no se usa el JWT de la SPA.

### TC-16 — Paquete de producción

- **Origen:** RF-12, EC-8
- **Prioridad:** P1
- **Precondiciones:** build de distribución.
- **Dado:** el manifiesto del paquete de producción.
- **Cuando:** se inspecciona identidad, API por defecto y hosts.
- **Entonces:** el nombre visible es GlyphLog Companion, la API por defecto es
  `https://glyphlog.qzz.io` y no aparece `http://localhost:8000/*` como host
  permitido.

## Preguntas abiertas

Ninguna. Canal unlisted sin publicar, guía in-app y detección SPA quedaron
cerradas en el gate de Plan mode.

## Criterios de salida

- [x] Cada `RF-*` y `EC-*` testeable aparece en la matriz.
- [x] Cada caso tiene precondición, estímulo y resultado observable.
- [x] Los resultados esperados provienen solo de la spec.
- [x] No contiene archivos, clases, mocks, fixtures ni frameworks.
- [x] Los casos pueden fallar por una implementación incorrecta aunque esta sea internamente consistente.
- [x] Las preguntas materiales están resueltas.
