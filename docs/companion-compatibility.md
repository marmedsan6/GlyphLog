# GlyphLog Companion — benchmark y matriz de compatibilidad

> **Estado:** implementada (spike documental de la issue #66)  
> **Fecha de consulta de fuentes:** 2026-08-26  
> **Alcance:** política de compatibilidad, benchmark reproducible y contratos QA; no modifica adaptadores, API, permisos ni código de producción.

## Conclusión ejecutiva

GlyphLog Companion mantiene como soporte actual Crunchyroll, AnimeFLV y
MangaDex. El siguiente adaptador recomendado es **MangaPlus**: ofrece un
servicio oficial, una superficie de host acotada, contenido en español y
señales de URL/DOM que pueden convertirse en fixtures verificables. El
siguiente navegador recomendado es **Edge**, porque reutiliza el target
Chromium/WXT con un coste de distribución y pruebas pequeño. **Firefox** queda
como candidato posterior para cubrir Gecko y **Safari** no se soporta
inicialmente por el coste de build, distribución y validación.

La recomendación es una priorización, no una promesa de disponibilidad. Una
fila puede estar implementada y seguir pendiente de verificación E2E. Los
hosts se conceden por allowlist explícita; nunca se usará `<all_urls>` ni un
equivalente wildcard opcional.

## Fuentes y método

Todas las fuentes se consultaron el 2026-08-26. Las páginas de terceros se
usan para contexto de mercado o disponibilidad; la evidencia técnica se
prefiere de repositorios y documentación oficiales.

- [MAL-Sync, release 0.12.4](https://github.com/MALSync/MALSync/releases/tag/0.12.4), publicada el 2026-07-15; el benchmark se fija en el commit del tag [`8c48caf3582bd3dfd831fc7d8730c22ab2646a13`](https://github.com/MALSync/MALSync/commit/8c48caf3582bd3dfd831fc7d8730c22ab2646a13). Licencia GPLv3: se observan patrones, no se copia código, marcas ni arquitectura interna.
- [MAL-Sync Crunchyroll implementation](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/src/pages-chibi/implementations/Crunchyroll/main.ts) y [tests](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/src/pages-chibi/implementations/Crunchyroll/tests.json).
- [MAL-Sync MangaDex implementation](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/src/pages/Mangadex/main.ts) y [tests](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/src/pages/Mangadex/tests.json) (el archivo marca sus casos como `enabled: false`; por tanto no se trata como validación positiva).
- [MAL-Sync MangaPlus implementation](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/src/pages-chibi/implementations/MangaPlus/main.ts) y [tests](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/src/pages-chibi/implementations/MangaPlus/tests.json).
- [MAL-Sync asynchronous helpers](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/src/chibiScript/functions/core/asyncFunctions.ts) y [tests unitarios](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/test/src/chibiScript/functions/asyncFunctions.test.ts).
- [MAL-Sync manifest](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/webpackConfig/webextension.assets.js) y [permisos](https://github.com/MALSync/MALSync/blob/8c48caf3582bd3dfd831fc7d8730c22ab2646a13/src/utils/permissions.ts), usados únicamente para contrastar superficie de permisos.
- [Chrome permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions), [declaración de permisos](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) y [guía de seguridad](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure).
- [MDN `host_permissions`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions) y [WXT: targets por navegador](https://wxt.dev/guide/essentials/target-different-browsers).
- [Brave: instalación de extensiones](https://support.brave.com/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave) y [StatCounter desktop worldwide, julio de 2026](https://gs.statcounter.com/browser-market-share/desktop-/worldwide), consultado como señal de alcance y no como analítica propia.
- [MANGA Plus en español](https://mangaplus.shueisha.co.jp/web_pages/49/) y [FAQ oficial de MANGA Plus](https://mangaplus.shueisha.co.jp/faq/eng/) para servicio, idioma y disponibilidad regional.
- [Requisitos de navegador de Netflix](https://help.netflix.com/es/node/30081), [dispositivos de HIDIVE](https://support.hidive.com/kb/guide/en/what-devices-are-supported-Ww6KMjSCvx/Steps/4307589), [restricción de extensiones al usar Chromecast en HIDIVE](https://support.hidive.com/kb/guide/en/using-hidive-on-chromecast-dCvez2cNN0/Steps/4307534) y [oferta/disponibilidad web de ADN](https://support.animationdigitalnetwork.com/hc/en-us/articles/32424039880861-About-the-ADN-Offer).

Si una URL deja de ser accesible, la fila afectada se marca `no verificada`;
no se rellena la evidencia por inferencia. Las cifras de usuarios son
valoraciones 1–5 basadas en señales públicas de alcance y quedan sujetas a
revisión cuando exista telemetría del proyecto.

## Benchmark reproducible de MAL-Sync

El benchmark se limita a patrones observables en el release y commit fijados.
No es una dependencia de GlyphLog ni una autorización para reutilizar código.

### Obtención y señales

- **Crunchyroll:** combina coincidencia de URL con metadatos y observación de
  peticiones de red mediante un proxy de requests. La implementación mantiene
  un detector de cambios y aplica debounce de 500 ms para no reaccionar a cada
  mutación.
- **MangaDex:** usa datos de la API pública del sitio cuando están disponibles,
  además de señales del lector y del DOM. Espera condiciones de UI antes de
  leer el capítulo y contempla lectores alternativos y estados incompletos.
- **MangaPlus:** prioriza patrones de URL (`viewer/...`, `titles/...`) y
  selectores del DOM, con ciclo de vida explícito para DOM listo, hidratación,
  cambio de URL y espera de condición. Sus casos de prueba habilitados son la
  evidencia de referencia más fuerte del shortlist.
- **Netflix/HIDIVE/ADN:** se conservan como candidatos de investigación. La
  presencia de páginas o metadatos en MAL-Sync no equivale a soporte de
  GlyphLog: autenticación, DRM y cambios frecuentes requieren validación
  manual antes de prometer un adaptador.

### SPA, hidratación y degradación

Los helpers observados en MAL-Sync separan cinco problemas que son reutilizables
como ideas de diseño:

1. ejecutar tras `DOMContentLoaded`/DOM listo;
2. esperar una condición concreta con timeout y salida controlada;
3. detectar cambios de URL o estado sin recargar la pestaña;
4. aplicar debounce (500 ms en el caso observado) a cambios ruidosos;
5. consultar una señal de red o API cuando el DOM aún no contiene el dato.

Ante título genérico, DOM incompleto, respuesta ausente, región no disponible,
login requerido o petición fallida, el resultado seguro es `null`/estado
degradado y una nueva oportunidad de detección; nunca se inventa un título ni
se bloquea la página. Un timeout debe dejar un diagnóstico observable en la
prueba, aunque el overlay de usuario pueda permanecer oculto.

### Qué se reutiliza y qué se rechaza

Se reutilizan como patrones documentales la espera con timeout, el detector de
cambios, el debounce, la separación entre URL/DOM/red y la degradación
silenciosa. Se rechaza la superficie de permisos de MAL-Sync: su manifest
incluye permisos amplios y `optional_host_permissions` wildcard, mientras que
GlyphLog mantiene hosts explícitos por plataforma y el host de API estrictamente
necesario.

## Matriz de compatibilidad

La matriz distingue estado de implementación de nivel de evidencia. `Soportado`
significa que existe adaptador y host explícito; `candidato siguiente` requiere
trabajo priorizado; `candidato posterior` queda detrás de la siguiente fase;
`no soportado` es una exclusión deliberada o un host fuera de la allowlist.

### Plataformas

- **Crunchyroll — soportado.** Anime; Chrome y Brave. Señales: URL, DOM y
  metadatos del episodio. Calidad: media, con fixture de adaptador y pendiente
  de E2E local. Región/login pueden cambiar el DOM. Host requerido:
  `https://www.crunchyroll.com/*`. Evidencia: fixture + revisión manual; última
  verificación documental 2026-08-26. Riesgo: alto cambio de SPA y datos
  personalizados.
- **AnimeFLV — soportado.** Anime; Chrome y Brave. Señales: URL/DOM del
  episodio. Calidad: media; fixture existente, E2E pendiente. Host:
  `https://animeflv.net/*` y `https://*.animeflv.net/*`. Evidencia: fixture;
  validación regional manual. Riesgo: variantes de host y HTML no estable.
- **MangaDex — soportado.** Manga; Chrome y Brave. Señales: URL, DOM del
  capítulo y metadatos del lector. Calidad: media; fixture existente, E2E
  pendiente. Host: `https://mangadex.org/*`. Cuenta/idioma y lector pueden
  cambiar la disponibilidad. Evidencia: fixture + manual; riesgo medio-alto.
- **MangaPlus — candidato siguiente.** Manga; Chrome, Brave y Edge como
  objetivo inicial. Señales: URL `viewer`/`titles`, DOM y estado de
  hidratación. Calidad: alta para rutas públicas; FAQ advierte disponibilidad
  regional. Host propuesto: `https://mangaplus.shueisha.co.jp/*`, sujeto a
  revisión del adaptador. Evidencia: análisis de implementación/tests de
  MAL-Sync y manual pendiente; no hay fixture GlyphLog. Riesgo medio: catálogo
  y restricciones regionales.
- **Netflix — candidato posterior; no soportado inicialmente.** Anime/series;
  Chrome/Brave/Edge. Señales potenciales de URL/DOM, pero autenticación, DRM y
  datos personalizados reducen la calidad. Host requeriría revisión específica.
  Evidencia únicamente manual/documental; riesgo alto y mantenimiento alto.
- **HIDIVE — candidato posterior.** Anime; Chrome/Brave/Edge. Señales
  potenciales de URL/DOM; login, región y restricciones de reproducción deben
  validarse manualmente. Host pendiente de allowlist. Evidencia documental;
  riesgo alto.
- **ADN — candidato posterior.** Anime; Chrome/Brave/Edge. Señales potenciales
  de URL/DOM; disponibilidad europea/regional y login requieren pruebas
  manuales. Host pendiente de allowlist. Evidencia documental; riesgo medio-alto.
- **Cualquier plataforma fuera de esta lista — no soportado.** No se inyecta
  contenido ni se solicita host hasta una revisión consciente, un adaptador,
  fixtures y una actualización de la matriz.

Campos obligatorios para toda nueva fila: plataforma, tipo de medio,
navegadores, señales, calidad de datos, región/autenticación, hosts, evidencia
(fixture/E2E/manual), fecha, riesgo y limitaciones.

### Puntuación de plataformas

Se usa `score = Σ(puntuación_1_a_5 × peso / 5)`, resultado 0–100:

- usuarios potenciales 35 %;
- estabilidad de datos/DOM 30 %;
- ajuste a permisos mínimos 20 %;
- mantenimiento 15 %.

Puntuaciones reproducibles del shortlist: Crunchyroll **78** (5,3,4,3),
AnimeFLV **57** (3,3,3,2), MangaDex **77** (4,4,4,3), MangaPlus **84**
(4,4,5,4), Netflix **66** (5,2,4,1), HIDIVE **61** (3,3,4,2) y ADN **57**
(2,3,4,3). En empates se priorizan permisos y después estabilidad. Los
valores son hipótesis revisables, no datos de uso de GlyphLog; por eso la
decisión MangaPlus también exige evidencia verificable y host acotado.

### Navegadores

- **Chrome — soportado/baseline.** Alcance 5, cobertura incremental 3,
  viabilidad WXT/distribución 5, coste de pruebas 5: **90/100**.
- **Brave — soportado/smoke real.** Alcance 3, incremental 3, viabilidad 5,
  coste 4: **71/100**. Comparte Chromium, pero la carga local y shields se
  validan en navegador real.
- **Edge — candidato siguiente.** Alcance 4, incremental 2, viabilidad 5,
  coste 5: **77/100**. Reutiliza el target Chromium y añade alcance de
  escritorio con cambios mínimos de build/distribución.
- **Firefox — candidato posterior.** Alcance 3, incremental 5, viabilidad 3,
  coste 3: **70/100**. Aporta Gecko, pero requiere target, permisos y E2E
  específicos.
- **Safari — no soportado inicialmente.** Alcance 3, incremental 5,
  viabilidad 1, coste 1: **56/100**. Build, firma, distribución y validación
  de WebExtension elevan el coste para esta fase.

Pesos: usuarios potenciales 40 %, cobertura técnica incremental 25 %,
viabilidad WXT/distribución 20 % y coste de pruebas 15 %. En empate se prioriza
viabilidad y después alcance. Las señales públicas de mercado no sustituyen
pruebas de instalación.

## Contrato de fixtures para la issue #68

Cada fixture es un escenario autocontenido, versionado y sanitizado. Debe
contener HTML mínimo más metadatos en un archivo adyacente (JSON/YAML) con:

```text
platform, scenario, capturedAt, sourceUrlPattern, locale,
hydrationState (initial|hydrated|degraded), authenticated (false),
sanitized (true), expected, redactions
```

`expected` es `null` cuando no debe detectarse nada o un objeto con tipo de
medio, título, número de episodio/capítulo, URL canónica y cualquier campo
opcional. `capturedAt` usa fecha ISO; `sourceUrlPattern` nunca contiene
tokens. No se guardan cookies, cabeceras de autorización, tokens, nombres,
correos, imágenes innecesarias ni contenido que no participe en la detección.

Escenarios mínimos por adaptador:

1. URL no compatible → `expected: null`;
2. prehidratación/título genérico → `expected: null` o estado degradado;
3. detección válida → objeto completo y URL canónica;
4. DOM incompleto → no hay falso positivo y el timeout es observable;
5. variante relevante del adaptador (locale, ruta del lector o cambio de
   selector) → resultado esperado explícito.

La fixture prueba parsing y saneamiento; no prueba autenticación real, región,
DRM ni el ciclo de navegación completo.

## Contrato E2E local para la issue #68

La prueba empaqueta la extensión, usa un perfil aislado y levanta API y
PostgreSQL locales. El oráculo comprueba el resultado observable y evita
duplicados, no detalles privados de implementación. La suite cubre:

- detección inicial;
- navegación SPA y cambio de URL/estado;
- entrada nueva y entrada existente;
- actualización de progreso;
- título dudoso o datos incompletos;
- token revocado;
- error de API;
- éxito parcial (overlay local aunque falle una acción remota);
- prevención de duplicados.

Chrome es el baseline automatizado. Brave y Edge ejecutan smoke en navegador
real; Firefox queda para la siguiente fase. Store review, permisos de región,
login y DRM se validan manualmente y se registran como evidencia separada. Una
regresión de adaptador se marca `degradado` si no rompe la navegación ni crea
datos incorrectos.

## Política de permisos y coherencia documental

La fuente de verdad runtime es `apps/extension/wxt.config.ts`: API local/remota
y hosts explícitos de Crunchyroll, AnimeFLV y MangaDex. La allowlist se revisa
por plataforma y cualquier host nuevo necesita ADR, matriz, fixture y E2E. No se
concede `<all_urls>`, `*://*/*` ni equivalentes opcionales, aunque el navegador
los permita técnicamente. “Implementado” describe código existente; “verificado”
requiere la evidencia indicada en la matriz.

La guía [docs/extension-testing-guide.md](extension-testing-guide.md), el
[README de la extensión](../apps/extension/README.md) y
[ADR-018](../memory-bank/decisions.md#adr-018) deben permanecer alineados con
esta política. ADR-010 se conserva como registro histórico, pero está marcada
como reemplazada.

## Trazabilidad y cierre

La spec y el test design definen `RF-*`, `EC-*` y `TC-*`; el task doc los enlaza
con esta evidencia. La validación final comprueba enlaces/fechas, recálculo de
puntuaciones, sanitización, diff sin runtime, tests/build de la extensión y el
manifest generado sin `<all_urls>`. La issue #68 puede implementar los
contratos sin inventar nuevos oráculos.
