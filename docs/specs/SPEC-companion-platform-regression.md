# [SPEC] Compatibilidad y regresión de GlyphLog Companion

> **Estado:** implementada
> **Prioridad:** alta
> **Dependencias:** [`SPEC-companion-compatibility`](./SPEC-companion-compatibility.md)
> **Test design derivado:** [`docs/test-specs/TEST-SPEC-companion-platform-regression.md`](../test-specs/TEST-SPEC-companion-platform-regression.md)
> **Task derivado:** [`docs/tasks/FIX-companion-platform-regression.md`](../tasks/FIX-companion-platform-regression.md)

## Contexto

GlyphLog Companion dispone de adaptadores para Crunchyroll, AnimeFLV y
MangaDex, además de cobertura unitaria parcial. La issue #66 definió la promesa
de compatibilidad, el contrato de fixtures y los niveles de evidencia, pero
dejó expresamente para la issue #68 las fixtures versionadas, las regresiones y
la prueba local del recorrido completo hasta PostgreSQL.

La línea base de #68 tiene 53 tests unitarios de extensión en verde y un build
Chromium MV3 correcto. No existe todavía un E2E con la extensión cargada. El
único E2E de la guía de Companion falla previamente porque una advertencia de
seguridad está renderizada pero oculta; ese defecto visual no forma parte de
esta especificación.

## Objetivo

Convertir el soporte de Companion para Chrome y Brave actuales, sobre
Crunchyroll, AnimeFLV y MangaDex, en una garantía reproducible basada en
fixtures sanitizadas, regresiones automatizadas y un E2E local que demuestre la
persistencia real sin depender de webs externas ni datos personales.

## Requisitos funcionales

- **RF-1 — Fixtures versionadas:** Como mantenedor, quiero que cada adaptador
  prioritario tenga escenarios DOM sanitizados y versionados con sus metadatos
  para poder detectar regresiones sin consultar la web externa.
- **RF-2 — Detección inicial:** Como usuario, quiero que una página prioritaria
  ya hidratada detecte título, tipo y progreso correctos para recibir una acción
  coherente con el contenido visitado.
- **RF-3 — Hidratación segura:** Como usuario, quiero que una página todavía
  incompleta o con título genérico no produzca una entrada falsa y pueda
  detectarse cuando aparezcan después las señales válidas.
- **RF-4 — Navegación SPA:** Como usuario, quiero que un cambio de contenido por
  navegación SPA vuelva a evaluar la página y muestre el nuevo medio sin
  requerir una recarga completa.
- **RF-5 — Entrada nueva end-to-end:** Como usuario autenticado mediante un
  dispositivo de Companion, quiero crear una entrada de anime o manga desde la
  página detectada y comprobar que se persiste una sola vez en mi colección.
- **RF-6 — Entrada existente y progreso:** Como usuario, quiero que Companion
  reconozca una entrada existente y actualice su progreso al episodio o capítulo
  detectado sin crear un duplicado.
- **RF-7 — Creación multipart:** Como mantenedor, quiero que la creación enviada
  por Companion conserve el contrato multipart esperado por la API para evitar
  regresiones entre content script, background y backend.
- **RF-8 — Éxito parcial recuperable:** Como usuario, quiero que un fallo al
  actualizar progreso después de una creación correcta informe que la entrada
  sí existe y que un reintento no cree otra entrada.
- **RF-9 — Autenticación revocada:** Como usuario con token revocado, quiero un
  error de autenticación claro y ninguna escritura para poder volver a emparejar
  el dispositivo con seguridad.
- **RF-10 — Errores de API:** Como usuario, quiero que un fallo controlado de la
  API sea visible, no rompa la página y no se presente como una operación
  completada.
- **RF-11 — Compatibilidad Chromium:** Como mantenedor, quiero evidencia
  automatizada en Chrome/Chromium y una comprobación equivalente en Brave
  actual cuando el ejecutable local esté disponible para distinguir soporte
  implementado de soporte verificado.
- **RF-12 — Matriz operativa:** Como mantenedor, quiero que la matriz indique
  fecha de última validación, tipo de evidencia, limitaciones y protocolo de
  degradación por cambio de DOM para no prometer soporte obsoleto.
- **RF-13 — Determinismo y privacidad:** Como responsable de QA, quiero que las
  pruebas no usen secretos, cuentas reales ni disponibilidad de webs externas
  para que sean reproducibles en local y CI.

## Contrato de fixtures

Cada escenario contiene HTML mínimo sanitizado y metadatos adyacentes con:

| Campo              | Tipo                                   | Obligatorio | Descripción                             |
| ------------------ | -------------------------------------- | ----------- | --------------------------------------- |
| `schemaVersion`    | entero positivo                        | sí          | Versión del contrato de fixture         |
| `platform`         | `crunchyroll`, `animeflv` o `mangadex` | sí          | Adaptador propietario                   |
| `scenario`         | string estable                         | sí          | Identificador legible del escenario     |
| `capturedAt`       | fecha ISO                              | sí          | Fecha de la evidencia DOM               |
| `sourceUrlPattern` | string sin secretos                    | sí          | Patrón de URL que activa el adaptador   |
| `locale`           | string BCP 47                          | sí          | Variante regional representada          |
| `hydrationState`   | `initial`, `hydrated` o `degraded`     | sí          | Estado observable del DOM               |
| `authenticated`    | `false`                                | sí          | Prohíbe capturas de cuenta real         |
| `sanitized`        | `true`                                 | sí          | Confirma retirada de datos sensibles    |
| `expected`         | media detectada o `null`               | sí          | Oráculo observable del escenario        |
| `redactions`       | lista de strings                       | sí          | Categorías retiradas, aunque esté vacía |

Cada adaptador cubre al menos una detección hidratada, una hidratación
incompleta y un título genérico o ambiguo. `expected` solo puede afirmar título,
tipo, episodio/capítulo y URL canónica cuando las señales son suficientes.

## Contrato E2E local

El recorrido observable es:

```text
página determinista → content script → background → API local → PostgreSQL aislado
```

La extensión se carga desde su build Chromium en un perfil de navegador
aislado. El escenario usa un usuario y token efímeros, nunca datos reales. La
creación se verifica consultando la API o la base local y la actualización se
verifica tanto por respuesta visible como por el progreso persistido. El mismo
contrato se aplica a anime y manga. Chrome/Chromium es el gate automatizado;
Brave aporta evidencia adicional cuando el entorno disponga de un binario
compatible con carga de extensiones.

## API contract

No se añaden endpoints. Se ejercitan los contratos existentes:

- `GET /api/v1/entries/?search=<title>` para localizar entradas del usuario;
- `POST /api/v1/entries/` como `multipart/form-data` para crear una entrada;
- `POST /api/v1/entries/{entry_id}/progress` como JSON con `new_value` y
  `note` opcional para actualizar progreso;
- autenticación `Bearer` mediante token efímero de dispositivo.

Resultados relevantes: éxito `2xx`; `401` para token ausente, inválido o
revocado; `409` ante duplicado; `422` para datos inválidos; `5xx` o fallo de red
como error de API no completado. El cuerpo concreto sigue los schemas vigentes.

## Schemas Pydantic

No se crean ni modifican schemas Pydantic. Los tests consumen los schemas
existentes de creación de entrada, actualización de progreso y autenticación de
dispositivo sin redefinirlos.

## Data models

No se crean tablas, columnas, relaciones ni migraciones. La evidencia E2E usa
los modelos existentes de usuario, token de dispositivo, entrada y eventos de
progreso en una base PostgreSQL local aislada.

## Edge cases

- **EC-1 — Prehidratación:** un DOM incompleto produce `null`; al aparecer las
  señales válidas dentro de la ventana de detección se obtiene exactamente un
  medio válido.
- **EC-2 — Título genérico:** textos como nombre de plataforma, “ver ahora” o
  formato exclusivo de episodio sin nombre de serie no se aceptan como título.
- **EC-3 — Navegaciones consecutivas:** varios eventos SPA no deben conservar
  datos del medio anterior ni crear overlays/acciones duplicadas.
- **EC-4 — Creación seguida de fallo:** si crear devuelve éxito y progreso
  falla, la entrada permanece persistida, se muestra éxito parcial y el reintento
  la trata como existente.
- **EC-5 — Progreso parcial:** si el progreso detectado supera un total conocido,
  se persiste como máximo ese total; si no hay progreso fiable, no se inventa.
- **EC-6 — Token revocado:** una respuesta `401` no se reintenta como creación ni
  altera la colección.
- **EC-7 — API no disponible o `5xx`:** se informa el fallo sin éxito falso y la
  página anfitriona continúa operativa.
- **EC-8 — Duplicado equivalente:** título normalizado y mismo tipo no generan
  una segunda entrada durante repetición o recuperación.
- **EC-9 — Brave no disponible:** la ausencia del ejecutable se registra como
  limitación de entorno y no como evidencia de compatibilidad aprobada.
- **EC-10 — Cambio de DOM:** si una fixture antes válida deja de detectarse, el
  adaptador se marca `degradado`, se documenta fecha/escenario/impacto y no vuelve
  a `soportado verificado` hasta incorporar evidencia automatizada verde y smoke
  manual cuando aplique.
- **EC-11 — Servicios locales ausentes:** un E2E sin API o PostgreSQL falla con
  diagnóstico de infraestructura; nunca degrada a un test simulado declarado
  como end-to-end.
- **EC-12 — Datos sensibles:** cualquier cookie, token, identificador de cuenta,
  historial o contenido personal invalida la fixture o evidencia.

## Fuera de alcance

- ❌ Añadir plataformas o navegadores fuera de Chrome, Brave, Crunchyroll,
  AnimeFLV y MangaDex.
- ❌ Consultar cuentas, páginas o catálogos externos durante tests automatizados.
- ❌ Cambiar endpoints, schemas, modelos o migraciones del backend salvo que una
  regresión demostrada del alcance lo haga imprescindible.
- ❌ Publicar la extensión, modificar su política de permisos o validar stores,
  región, DRM, suscripción o login real.
- ❌ Corregir el E2E visual preexistente de la guía de Companion.

## Criterios de salida

- [x] API contract existente y errores relevantes definidos.
- [x] Schemas Pydantic indicados sin cambios.
- [x] Data models y migraciones indicados sin cambios.
- [x] Edge cases enumerados y convertibles en tests.
- [x] Sin archivos, clases, mocks ni decisiones propias de Plan mode.
- [x] Requisitos y edge cases tienen identificadores estables `RF-*`/`EC-*`.
- [x] El test design `TC-*` puede escribirse solo leyendo esta spec.
