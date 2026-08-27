# [TEST-SPEC] Compatibilidad verificable de GlyphLog Companion

> **Estado:** implementada
> **Tier:** 3
> **Spec origen:** [`docs/specs/SPEC-companion-compatibility.md`](../specs/SPEC-companion-compatibility.md)
> **Task derivado:** [`docs/tasks/DOCS-companion-compatibility.md`](../tasks/DOCS-companion-compatibility.md)

## Alcance observable

Se verificará que el resultado documental de la issue #66 sea trazable,
reproducible, coherente con su política de permisos mínimos y suficientemente
preciso para que la issue #68 implemente fixtures y E2E sin redefinir los
oráculos. No se verificará comportamiento nuevo de adaptadores, API, base de
datos, manifest ni distribución en stores.

## Matriz de trazabilidad

| Origen            | Casos        | Cobertura esperada                             |
| ----------------- | ------------ | ---------------------------------------------- |
| RF-1              | TC-01        | Fuentes enlazadas y fechadas                   |
| RF-2, EC-10       | TC-02        | Benchmark completo sin copia de implementación |
| RF-3, RF-4        | TC-03        | Universo y campos de la matriz                 |
| RF-5, EC-2, EC-9  | TC-04        | Estados respaldados por evidencia              |
| RF-6, EC-7        | TC-05        | Puntuación de plataformas reproducible         |
| RF-7, EC-7        | TC-06        | Puntuación de navegadores reproducible         |
| RF-8              | TC-07        | Recomendación de MangaPlus                     |
| RF-9              | TC-08        | Recomendación de Edge y orden posterior        |
| RF-10, EC-6, EC-8 | TC-09, TC-10 | Contrato y privacidad de fixtures              |
| RF-11             | TC-11        | Contrato E2E completo                          |
| RF-12, EC-4       | TC-12        | Separación de niveles de evidencia             |
| RF-13, EC-5       | TC-13        | Permisos mínimos y rechazo de patrones amplios |
| RF-14             | TC-14        | Fuentes de verdad coherentes                   |
| EC-1, EC-3        | TC-15        | Fuentes inaccesibles o contradictorias         |
| RF-1 a RF-14      | TC-16        | Respeto del fuera de alcance                   |

## Casos de prueba

### TC-01 — Trazabilidad de fuentes

- **Origen:** RF-1
- **Prioridad:** P0
- **Precondiciones:** existe al menos una afirmación basada en información externa.
- **Dado:** el resultado documental terminado.
- **Cuando:** se revisan sus afirmaciones externas relevantes.
- **Entonces:** cada una dispone de fuente primaria enlazada y fecha de consulta explícita.
- **Datos límite:** una fuente consultada y varias fuentes para una misma conclusión.

### TC-02 — Cobertura del benchmark de MAL-Sync

- **Origen:** RF-2, EC-10
- **Prioridad:** P0
- **Precondiciones:** el benchmark identifica una versión o revisión concreta de MAL-Sync.
- **Dado:** el apartado de benchmark.
- **Cuando:** se revisa su contenido.
- **Entonces:** describe obtención de datos, espera SPA, reacción a cambios,
  degradación y permisos; distingue patrones reutilizables y no incorpora código,
  marcas ni arquitectura interna como implementación propia.
- **Datos límite:** estrategia específica de una plataforma y utilidad compartida.

### TC-03 — Universo cerrado y matriz completa

- **Origen:** RF-3, RF-4
- **Prioridad:** P0
- **Precondiciones:** existe una matriz de compatibilidad.
- **Dado:** el universo aprobado en la spec.
- **Cuando:** se comparan sus elementos con las filas y columnas de la matriz.
- **Entonces:** aparecen las siete plataformas y los cinco navegadores, y cada
  caso informa medio, señales, datos, restricciones, hosts, evidencia, fecha,
  riesgo y limitaciones.
- **Datos límite:** plataforma actual, candidata y navegador no soportado.

### TC-04 — Estado respaldado por evidencia

- **Origen:** RF-5, EC-2, EC-9
- **Prioridad:** P0
- **Precondiciones:** cada caso tiene estado y evidencia declarados.
- **Dado:** un caso implementado sin validación reciente y otro con evidencia vigente.
- **Cuando:** se comparan sus estados.
- **Entonces:** el primero no se presenta como verificado y el segundo muestra
  evidencia y fecha; un cambio de DOM sin cubrir queda degradado o limitado.
- **Datos límite:** evidencia ausente, manual, fixture y E2E.

### TC-05 — Cálculo y desempate de plataformas

- **Origen:** RF-6, EC-7
- **Prioridad:** P0
- **Precondiciones:** todas las plataformas candidatas tienen puntuaciones de 1 a 5.
- **Dado:** las puntuaciones y pesos definidos por la spec.
- **Cuando:** se recalcula cada total.
- **Entonces:** el resultado coincide, está entre 0 y 100 y cualquier empate se
  resuelve primero por permisos y después por estabilidad.
- **Datos límite:** puntuaciones mínimas, máximas y empate exacto.

### TC-06 — Cálculo y desempate de navegadores

- **Origen:** RF-7, EC-7
- **Prioridad:** P0
- **Precondiciones:** todos los navegadores candidatos tienen puntuaciones de 1 a 5.
- **Dado:** las puntuaciones y pesos definidos por la spec.
- **Cuando:** se recalcula cada total.
- **Entonces:** el resultado coincide, está entre 0 y 100 y cualquier empate se
  resuelve primero por viabilidad y después por alcance.
- **Datos límite:** puntuaciones mínimas, máximas y empate exacto.

### TC-07 — Recomendación explícita de plataforma

- **Origen:** RF-8
- **Prioridad:** P0
- **Precondiciones:** la matriz y la puntuación de plataformas están completas.
- **Dado:** el apartado de recomendación.
- **Cuando:** se revisa la siguiente plataforma propuesta.
- **Entonces:** MangaPlus aparece como siguiente plataforma con justificación de
  alcance, español, host y detectabilidad; Netflix, HIDIVE y ADN quedan como
  candidatos posteriores con limitaciones explícitas.
- **Datos límite:** Netflix con alto alcance pero alto coste de mantenimiento.

### TC-08 — Recomendación explícita de navegador

- **Origen:** RF-9
- **Prioridad:** P0
- **Precondiciones:** la matriz y la puntuación de navegadores están completas.
- **Dado:** el apartado de recomendación.
- **Cuando:** se revisa el orden propuesto.
- **Entonces:** Edge figura como siguiente navegador, Firefox como candidato
  posterior para Gecko y Safari como no soportado inicialmente con sus razones.
- **Datos límite:** compatibilidad Chromium frente a cobertura de un motor distinto.

### TC-09 — Contrato funcional de fixtures

- **Origen:** RF-10, EC-6
- **Prioridad:** P0
- **Precondiciones:** existe un contrato común para escenarios de adaptador.
- **Dado:** el contrato de fixtures.
- **Cuando:** se revisan sus campos y escenarios obligatorios.
- **Entonces:** exige HTML sanitizado, metadatos de plataforma, escenario, fecha,
  patrón de URL, locale, hidratación y expectativa; cubre URL incompatible,
  prehidratación, detección válida, DOM incompleto y variante relevante.
- **Datos límite:** título genérico, progreso ambiguo y detección nula.

### TC-10 — Privacidad de fixtures

- **Origen:** RF-10, EC-8
- **Prioridad:** P0
- **Precondiciones:** se propone capturar HTML de una plataforma externa.
- **Dado:** las reglas de sanitización.
- **Cuando:** se evalúa un fixture con cookies, token, cuenta o historial personal.
- **Entonces:** el fixture se considera inválido hasta retirar toda información
  sensible y contenido no necesario.
- **Datos límite:** identificadores de sesión en atributos, scripts o cabeceras embebidas.

### TC-11 — Contrato E2E completo

- **Origen:** RF-11
- **Prioridad:** P0
- **Precondiciones:** existe un contrato de pruebas end-to-end.
- **Dado:** la extensión empaquetada, un perfil aislado y servicios locales independientes.
- **Cuando:** se enumeran los flujos exigidos.
- **Entonces:** incluye detección inicial, navegación SPA, entrada nueva y
  existente, progreso, título dudoso, token revocado, error de API, éxito parcial
  y prevención de duplicados, con resultados observables para cada flujo.
- **Datos límite:** fallo posterior a una creación correcta y repetición del intento.

### TC-12 — Separación de niveles de evidencia

- **Origen:** RF-12, EC-4
- **Prioridad:** P0
- **Precondiciones:** la matriz y los contratos QA están disponibles.
- **Dado:** capacidades deterministas, recorridos locales y restricciones externas.
- **Cuando:** se asigna un nivel de evidencia a cada una.
- **Entonces:** extracción determinista se asigna a fixture; integración completa a
  E2E local; store, navegador real, región, login, suscripción o DRM a validación manual.
- **Datos límite:** una capacidad que necesita más de un nivel de evidencia.

### TC-13 — Política de permisos mínimos

- **Origen:** RF-13, EC-5
- **Prioridad:** P0
- **Precondiciones:** existe una política de incorporación de plataformas.
- **Dado:** un candidato que requiere un host explícito y otro que requiere acceso general.
- **Cuando:** se aplica la política.
- **Entonces:** el primero puede evaluarse y el segundo queda fuera del soporte
  inicial; `<all_urls>` y equivalentes amplios están prohibidos también como permisos opcionales.
- **Datos límite:** wildcard de subdominio acotado frente a wildcard de cualquier host.

### TC-14 — Coherencia de fuentes de verdad

- **Origen:** RF-14
- **Prioridad:** P0
- **Precondiciones:** se han corregido las inconsistencias identificadas.
- **Dado:** la política arquitectónica, la guía de pruebas y la presentación de permisos.
- **Cuando:** se comparan adaptadores, hosts y temporización descritos.
- **Entonces:** las tres fuentes coinciden en plataformas actuales, acceso limitado,
  número máximo de intentos, intervalo y retardo tras navegación SPA.
- **Datos límite:** diferencia entre intervalo de reintento y retardo de navegación.

### TC-15 — Fuente inaccesible o contradictoria

- **Origen:** EC-1, EC-3
- **Prioridad:** P1
- **Precondiciones:** una afirmación depende de una fuente no accesible o discrepante.
- **Dado:** la evidencia disponible.
- **Cuando:** se documenta la afirmación.
- **Entonces:** se marca `no verificada` si no puede consultarse; si hay conflicto,
  se prioriza la fuente primaria más reciente y se explica la discrepancia y su impacto.
- **Datos límite:** fuente secundaria reciente frente a fuente primaria más antigua.

### TC-16 — Respeto del fuera de alcance

- **Origen:** RF-1 a RF-14
- **Prioridad:** P0
- **Precondiciones:** el resultado documental está terminado.
- **Dado:** el conjunto de cambios de la tarea.
- **Cuando:** se revisa su alcance.
- **Entonces:** no existen cambios de adaptadores, reintentos, detección, manifest,
  API, base de datos, fixtures ejecutables, E2E ejecutables ni distribución.
- **Datos límite:** correcciones documentales que describen código existente.

## Preguntas abiertas

Ninguna.

## Criterios de salida

- [x] Cada `RF-*` y `EC-*` testeable aparece en la matriz.
- [x] Cada caso tiene precondición, estímulo y resultado observable.
- [x] Los resultados esperados provienen solo de la spec.
- [x] No contiene archivos de implementación, clases, mocks, fixtures concretos ni frameworks.
- [x] Los casos pueden fallar aunque el documento sea internamente consistente.
- [x] Las preguntas materiales están resueltas.
