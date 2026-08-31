# [TEST-SPEC] Compatibilidad y regresión de GlyphLog Companion

> **Estado:** implementada
> **Tier:** 3
> **Spec origen:** [`docs/specs/SPEC-companion-platform-regression.md`](../specs/SPEC-companion-platform-regression.md)
> **Task derivado:** [`docs/tasks/FIX-companion-platform-regression.md`](../tasks/FIX-companion-platform-regression.md)

## Alcance observable

Se verificará la detección determinista de los tres adaptadores prioritarios,
su degradación segura, la navegación SPA y el recorrido local completo de
creación y progreso desde una extensión cargada hasta PostgreSQL. También se
verificarán el contrato multipart, la recuperación de éxitos parciales, los
errores de autenticación/API y la evidencia operativa para Chrome y Brave.

No se verifican stores, cuentas externas, región, DRM, suscripciones, nuevas
plataformas ni navegadores fuera del alcance de la spec.

## Matriz de trazabilidad

| Origen             | Casos               | Cobertura esperada                                      |
| ------------------ | ------------------- | ------------------------------------------------------- |
| RF-1, RF-13, EC-12 | TC-01               | Contrato, versión y privacidad de escenarios DOM        |
| RF-2               | TC-02, TC-03, TC-04 | Detección inicial de cada plataforma prioritaria        |
| RF-3, EC-1, EC-2   | TC-05, TC-06        | Prehidratación y títulos genéricos sin falsos positivos |
| RF-4, EC-3         | TC-07               | Navegación SPA sin estado ni acciones duplicadas        |
| RF-5               | TC-08, TC-09        | Creación E2E real de anime y manga                      |
| RF-6, EC-8         | TC-10, TC-11        | Entrada existente, progreso y prevención de duplicados  |
| RF-7               | TC-12               | Creación multipart extremo a extremo                    |
| RF-8, EC-4, EC-8   | TC-13               | Éxito parcial y reintento idempotente                   |
| EC-5               | TC-14, TC-15        | Límite conocido y progreso no fiable                    |
| RF-9, EC-6         | TC-16               | Token revocado sin escritura                            |
| RF-10, EC-7        | TC-17               | Error de API visible y página operativa                 |
| RF-11              | TC-18               | Gate automatizado Chrome/Chromium                       |
| RF-11, EC-9        | TC-19               | Evidencia Brave o limitación explícita                  |
| RF-12, EC-10       | TC-20               | Matriz y protocolo de adaptador degradado               |
| EC-11              | TC-21               | Fallo explícito por servicios locales ausentes          |

## Casos de prueba

### TC-01 — Escenarios DOM versionados y sanitizados

- **Origen:** RF-1, RF-13, EC-12
- **Prioridad:** P0
- **Precondiciones:** existe al menos un conjunto de escenarios para cada plataforma prioritaria.
- **Dado:** los escenarios DOM y sus metadatos.
- **Cuando:** se validan contra el contrato de la spec.
- **Entonces:** cada plataforma contiene detección hidratada, hidratación
  incompleta y título genérico; todos los campos obligatorios son válidos y no
  existe ningún dato personal, secreto o contenido innecesario.
- **Datos límite:** lista de redacciones vacía; expectativa `null`; locale distinto.

### TC-02 — Detección inicial de Crunchyroll

- **Origen:** RF-2
- **Prioridad:** P0
- **Precondiciones:** página Crunchyroll ya hidratada con señales suficientes.
- **Dado:** un episodio con título de serie inequívoco.
- **Cuando:** Companion evalúa la página por primera vez.
- **Entonces:** devuelve exactamente tipo anime, título, episodio y URL canónica esperados.
- **Datos límite:** locale y sufijo de plataforma en el título.

### TC-03 — Detección inicial de AnimeFLV

- **Origen:** RF-2
- **Prioridad:** P0
- **Precondiciones:** página AnimeFLV ya hidratada con señales suficientes.
- **Dado:** un episodio bajo el host o subdominio admitido.
- **Cuando:** Companion evalúa la página por primera vez.
- **Entonces:** devuelve exactamente tipo anime, título, episodio y URL canónica esperados.
- **Datos límite:** números presentes en el título además del episodio.

### TC-04 — Detección inicial de MangaDex

- **Origen:** RF-2
- **Prioridad:** P0
- **Precondiciones:** lector MangaDex ya hidratado con señales suficientes.
- **Dado:** un capítulo con título de manga inequívoco.
- **Cuando:** Companion evalúa la página por primera vez.
- **Entonces:** devuelve exactamente tipo manga, título, capítulo y URL canónica esperados.
- **Datos límite:** capítulo decimal normalizado según el contrato vigente y oneshot.

### TC-05 — Hidratación incompleta seguida de señales válidas

- **Origen:** RF-3, EC-1
- **Prioridad:** P0
- **Precondiciones:** la URL corresponde a un adaptador prioritario.
- **Dado:** un DOM inicial incompleto que después se hidrata con datos válidos.
- **Cuando:** Companion evalúa durante la ventana de detección.
- **Entonces:** no produce media antes de tiempo y después produce exactamente
  una detección válida.
- **Datos límite:** hidratación en el último intento permitido.

### TC-06 — Título genérico o ambiguo

- **Origen:** RF-3, EC-2
- **Prioridad:** P0
- **Precondiciones:** la URL corresponde a un adaptador prioritario.
- **Dado:** solo existe un nombre de plataforma, llamada genérica a reproducir o
  número de episodio sin nombre de serie fiable.
- **Cuando:** Companion evalúa la página.
- **Entonces:** el resultado es nulo y no ofrece crear ni actualizar una entrada.
- **Datos límite:** espacios, mayúsculas, traducciones y metadato vacío.

### TC-07 — Cambio SPA a otro medio

- **Origen:** RF-4, EC-3
- **Prioridad:** P0
- **Precondiciones:** el content script está activo en un host admitido, incluso
  si la ruta inicial todavía no corresponde a un reproductor.
- **Dado:** la página entra al reproductor por SPA y cambia URL sin recarga
  completa mientras conserva temporalmente el título o DOM de la ruta anterior.
- **Cuando:** se completa la hidratación del medio, incluso después de la primera
  ventana de reintentos y la SPA sustituye el shell completo del documento.
- **Entonces:** la acción visible corresponde solo al segundo medio y los
  eventos consecutivos no duplican overlays ni operaciones.
- **Datos límite:** navegación mediante clic desde Crunchylists, reemplazo de
  `<html>`, hidratación tardía,
  adelante/atrás y dos eventos cercanos.

### TC-08 — Crear anime desde la extensión hasta PostgreSQL

- **Origen:** RF-5
- **Prioridad:** P0
- **Precondiciones:** extensión cargada, usuario/token efímeros y servicios locales saludables.
- **Dado:** un anime detectado que no existe en la colección.
- **Cuando:** el usuario confirma la creación.
- **Entonces:** se informa éxito y PostgreSQL contiene exactamente una entrada
  anime del usuario con los datos y progreso esperados.
- **Datos límite:** metadatos externos ausentes.

### TC-09 — Crear manga desde la extensión hasta PostgreSQL

- **Origen:** RF-5
- **Prioridad:** P0
- **Precondiciones:** extensión cargada, usuario/token efímeros y servicios locales saludables.
- **Dado:** un manga detectado que no existe en la colección.
- **Cuando:** el usuario confirma la creación.
- **Entonces:** se informa éxito y PostgreSQL contiene exactamente una entrada
  manga del usuario con los datos y progreso esperados.
- **Datos límite:** capítulo inicial distinto de uno.

### TC-10 — Actualizar progreso de anime existente

- **Origen:** RF-6, EC-8
- **Prioridad:** P0
- **Precondiciones:** existe una entrada anime del mismo usuario y título normalizado.
- **Dado:** la página detecta un episodio posterior.
- **Cuando:** el usuario confirma la actualización.
- **Entonces:** cambia el progreso persistido y el recuento de entradas
  equivalentes permanece en uno.
- **Datos límite:** misma capitalización y espacios distintos.

### TC-11 — Actualizar progreso de manga existente

- **Origen:** RF-6, EC-8
- **Prioridad:** P0
- **Precondiciones:** existe una entrada manga del mismo usuario y título normalizado.
- **Dado:** la página detecta un capítulo posterior.
- **Cuando:** el usuario confirma la actualización.
- **Entonces:** cambia el progreso persistido y el recuento de entradas
  equivalentes permanece en uno.
- **Datos límite:** mismo título presente también como anime no equivalente.

### TC-12 — Contrato multipart de creación

- **Origen:** RF-7
- **Prioridad:** P0
- **Precondiciones:** Companion dispone de token efímero válido.
- **Dado:** datos mínimos y metadatos opcionales de una nueva entrada.
- **Cuando:** la petición atraviesa background y llega a la API.
- **Entonces:** la API recibe multipart válido sin cabecera de boundary manual,
  crea la entrada y conserva los campos definidos.
- **Datos límite:** opcionales ausentes y valor numérico cero no omitido indebidamente.

### TC-13 — Creación correcta seguida de fallo de progreso

- **Origen:** RF-8, EC-4, EC-8
- **Prioridad:** P0
- **Precondiciones:** la entrada no existe y la creación puede completarse.
- **Dado:** la actualización posterior devuelve un fallo controlado.
- **Cuando:** el usuario crea y después repite la acción.
- **Entonces:** primero se informa éxito parcial indicando que la entrada existe;
  después se actualiza esa entrada o se informa el nuevo fallo, pero nunca se
  crea una segunda entrada equivalente.
- **Datos límite:** fallo `422`, red interrumpida y respuesta tardía.

### TC-14 — Progreso superior al total conocido

- **Origen:** EC-5
- **Prioridad:** P1
- **Precondiciones:** el total fiable es menor que el progreso detectado.
- **Dado:** una entrada nueva o existente con total conocido.
- **Cuando:** se confirma el progreso.
- **Entonces:** el valor persistido no supera el total conocido.
- **Datos límite:** igualdad exacta y una unidad por encima.

### TC-15 — Progreso ausente o no fiable

- **Origen:** EC-5
- **Prioridad:** P1
- **Precondiciones:** el título y tipo son fiables, pero no el progreso.
- **Dado:** la página carece de episodio/capítulo válido.
- **Cuando:** se procesa la acción permitida.
- **Entonces:** no se inventa ni persiste una actualización de progreso.
- **Datos límite:** cero, negativo, vacío y texto no numérico.

### TC-16 — Token de dispositivo revocado

- **Origen:** RF-9, EC-6
- **Prioridad:** P0
- **Precondiciones:** el token usado por Companion fue revocado.
- **Dado:** una acción que requeriría leer o escribir la colección.
- **Cuando:** la API responde `401`.
- **Entonces:** se muestra un error de autenticación accionable, no se reintenta
  como creación y la colección permanece sin cambios.
- **Datos límite:** token ausente, malformado y revocado después de cargar la página.

### TC-17 — Error controlado de API

- **Origen:** RF-10, EC-7
- **Prioridad:** P0
- **Precondiciones:** la página fue detectada correctamente.
- **Dado:** la API no está disponible o responde `5xx`.
- **Cuando:** el usuario intenta consultar o modificar su colección.
- **Entonces:** ve un error, no ve confirmación de éxito, no se registra una
  escritura incorrecta y la página anfitriona continúa operativa.
- **Datos límite:** cuerpo no JSON y respuesta sin detalle.

### TC-18 — Gate automatizado en Chrome/Chromium actual

- **Origen:** RF-11
- **Prioridad:** P0
- **Precondiciones:** build actual de la extensión y navegador Chromium compatible.
- **Dado:** los flujos E2E prioritarios.
- **Cuando:** se ejecutan en un perfil aislado con la extensión cargada.
- **Entonces:** todos terminan con sus resultados observables y la versión/fecha
  de navegador queda registrada como evidencia automatizada.
- **Datos límite:** ejecución headless compatible y perfil nuevo.

### TC-19 — Smoke equivalente en Brave actual

- **Origen:** RF-11, EC-9
- **Prioridad:** P1
- **Precondiciones:** el entorno puede o no disponer de Brave compatible.
- **Dado:** un flujo representativo de detección, creación y progreso.
- **Cuando:** se intenta ejecutar con la extensión cargada.
- **Entonces:** si Brave está disponible, el flujo pasa y registra versión/fecha;
  si no, se registra bloqueo de entorno y no se declara verificado.
- **Datos límite:** ruta de ejecutable alternativa y shields por defecto.

### TC-20 — Matriz y protocolo de degradación

- **Origen:** RF-12, EC-10
- **Prioridad:** P0
- **Precondiciones:** existen resultados de las validaciones de compatibilidad.
- **Dado:** cada adaptador y navegador prioritario.
- **Cuando:** se actualiza la evidencia.
- **Entonces:** la matriz muestra fecha, tipo de evidencia y limitaciones; un
  cambio DOM fallido queda `degradado` con escenario e impacto y solo recupera
  verificación tras evidencia automatizada verde y smoke cuando corresponda.
- **Datos límite:** evidencia unitaria verde con E2E bloqueado.

### TC-21 — Servicios locales ausentes

- **Origen:** EC-11
- **Prioridad:** P1
- **Precondiciones:** falta API o PostgreSQL.
- **Dado:** un E2E que exige persistencia real.
- **Cuando:** comienza la validación o se intenta la operación.
- **Entonces:** falla con diagnóstico del servicio ausente y no se informa un
  resultado simulado como end-to-end.
- **Datos límite:** API saludable con base inaccesible y viceversa.

## Preguntas abiertas

Ninguna. El contrato previo de #66 resuelve niveles de evidencia, privacidad,
plataformas, navegadores y criterio de degradación; #68 concreta su ejecución.

## Criterios de salida

- [x] Cada `RF-*` y `EC-*` testeable aparece en la matriz.
- [x] Cada caso tiene precondición, estímulo y resultado observable.
- [x] Los resultados esperados provienen solo de la spec.
- [x] No contiene archivos, clases, mocks, fixtures concretas ni frameworks.
- [x] Los casos pueden fallar por una implementación incorrecta aunque esta sea internamente consistente.
- [x] Las preguntas materiales están resueltas.
