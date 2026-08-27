# [SPEC] Compatibilidad verificable de GlyphLog Companion

> **Estado:** implementada
> **Prioridad:** alta
> **Dependencias:** ninguna; la issue #68 consumirá los contratos definidos aquí
> **Test design derivado:** [`docs/test-specs/TEST-SPEC-companion-compatibility.md`](../test-specs/TEST-SPEC-companion-compatibility.md)
> **Task derivado:** [`docs/tasks/DOCS-companion-compatibility.md`](../tasks/DOCS-companion-compatibility.md)

## Contexto

GlyphLog Companion detecta anime o manga en Crunchyroll, AnimeFLV y MangaDex,
pero el proyecto no dispone de una política verificable que distinga soporte
implementado, soporte validado y plataformas meramente candidatas. La
documentación vigente también contiene afirmaciones incompatibles entre sí
sobre los hosts autorizados, los tiempos de espera SPA y el acceso de la
extensión a páginas externas.

Antes de ampliar adaptadores o navegadores, el equipo necesita un benchmark
trazable de MAL-Sync, una matriz priorizada y contratos de calidad que la issue
#68 pueda convertir en fixtures y pruebas E2E sin redefinir el resultado
esperado.

## Objetivo

Definir y documentar una estrategia reproducible, verificable y de permisos
mínimos para decidir qué plataformas y navegadores soporta GlyphLog Companion.

## Requisitos funcionales

- **RF-1 — Fuentes trazables:** Como mantenedor, quiero que toda afirmación
  externa relevante indique fuente primaria, enlace y fecha de consulta para
  poder revalidarla cuando cambien los navegadores o las plataformas.
- **RF-2 — Benchmark técnico:** Como mantenedor, quiero comparar cómo MAL-Sync
  obtiene datos, espera la hidratación SPA, reacciona a cambios y degrada ante
  fallos para identificar patrones reutilizables sin copiar su código, marcas o
  arquitectura interna.
- **RF-3 — Universo de evaluación:** Como mantenedor, quiero evaluar las
  plataformas actuales Crunchyroll, AnimeFLV y MangaDex; las candidatas
  MangaPlus, Netflix, HIDIVE y ADN; los navegadores actuales Chrome y Brave; y
  los candidatos Edge, Firefox y Safari para que el alcance sea cerrado y
  reproducible.
- **RF-4 — Matriz de soporte:** Como mantenedor, quiero una matriz que exponga
  plataforma, tipo de medio, navegadores, señales de detección, calidad de
  datos, restricciones de región o autenticación, hosts requeridos, evidencia,
  fecha de verificación, riesgo y limitaciones para conocer la promesa real de
  compatibilidad.
- **RF-5 — Estados inequívocos:** Como mantenedor, quiero clasificar cada caso
  como `soportado`, `candidato siguiente`, `candidato posterior` o
  `no soportado`, distinguiendo explícitamente implementación de verificación,
  para no prometer soporte sin evidencia.
- **RF-6 — Priorización reproducible de plataformas:** Como mantenedor, quiero
  puntuar de 1 a 5 el potencial de usuarios (35 %), estabilidad de datos/DOM
  (30 %), ajuste a permisos mínimos (20 %) y coste de mantenimiento (15 %), con
  resultado normalizado de 0 a 100 y desempate por permisos y estabilidad, para
  poder repetir la decisión.
- **RF-7 — Priorización reproducible de navegadores:** Como mantenedor, quiero
  puntuar de 1 a 5 el potencial de usuarios (40 %), cobertura técnica
  incremental (25 %), viabilidad de build/distribución (20 %) y coste de
  pruebas/mantenimiento (15 %), con resultado normalizado de 0 a 100 y desempate
  por viabilidad y alcance, para poder repetir la decisión.
- **RF-8 — Recomendación de plataforma:** Como responsable de producto, quiero
  que MangaPlus quede recomendado como siguiente plataforma por su alcance,
  disponibilidad en español, host acotado y detección verificable, dejando
  Netflix, HIDIVE y ADN como candidatos posteriores según sus limitaciones.
- **RF-9 — Recomendación de navegador:** Como responsable de producto, quiero
  que Edge quede recomendado como siguiente navegador, Firefox como candidato
  posterior para cubrir Gecko y Safari como no soportado inicialmente, para
  equilibrar alcance y coste de mantenimiento.
- **RF-10 — Contrato de fixtures:** Como responsable de QA, quiero que cada
  escenario de adaptador defina HTML sanitizado y metadatos con plataforma,
  escenario, fecha, patrón de URL, locale, hidratación y resultado esperado para
  que la issue #68 pueda crear regresiones versionadas sin datos sensibles.
- **RF-11 — Contrato E2E:** Como responsable de QA, quiero definir entorno,
  flujos, navegadores y resultados observables del E2E local para demostrar el
  recorrido de la extensión empaquetada hasta la persistencia sin depender de
  datos personales ni de una base de datos compartida.
- **RF-12 — Niveles de evidencia:** Como mantenedor, quiero separar qué puede
  demostrarse con fixtures, qué requiere E2E local y qué exige comprobación
  manual para interpretar correctamente la confianza de cada fila de la matriz.
- **RF-13 — Permisos mínimos:** Como usuario de la extensión, quiero que el
  soporte se limite a hosts explícitos y que se prohíban `<all_urls>` y patrones
  equivalentes amplios, incluso opcionales, para limitar la exposición de mi
  navegación.
- **RF-14 — Fuentes de verdad coherentes:** Como mantenedor, quiero que la
  política arquitectónica, la guía de pruebas y la presentación de permisos
  describan los adaptadores y tiempos reales para evitar diagnósticos o promesas
  contradictorias.

## Contrato del resultado documental

No se añade ni modifica ningún endpoint. El resultado debe contener como mínimo:

- resumen ejecutivo y recomendación;
- metodología y fórmula de puntuación;
- benchmark técnico de MAL-Sync;
- matriz de plataformas y navegadores;
- política de estados y evidencia;
- contrato de fixtures;
- contrato E2E;
- política de permisos mínimos;
- fuentes con fecha de consulta y limitaciones conocidas.

La puntuación normalizada se calcula como la suma de
`puntuación × peso / 5` para cada criterio. Los pesos se expresan como
porcentajes y el total debe estar entre 0 y 100.

## API contract

N/A. Esta especificación no cambia la API de GlyphLog.

## Schemas Pydantic

N/A. No se crean ni modifican schemas de entrada o salida.

## Data models

N/A. No hay cambios de tablas, columnas, relaciones ni migraciones.

## Edge cases

- **EC-1 — Fuente inaccesible:** si una fuente no puede consultarse, la
  afirmación dependiente debe marcarse `no verificada`; no se sustituye por una
  inferencia presentada como hecho.
- **EC-2 — Evidencia obsoleta:** si la implementación existe pero no hay una
  validación reciente contra el sitio o navegador real, el estado debe separar
  `implementado` de `verificado` y mostrar la fecha disponible.
- **EC-3 — Fuentes contradictorias:** si dos fuentes discrepan, se prioriza la
  fuente primaria más reciente y se documenta la discrepancia y su impacto.
- **EC-4 — Región o autenticación:** si una plataforma exige región, cuenta,
  suscripción o contenido protegido, esa capacidad se marca para validación
  manual y no se considera automatizada.
- **EC-5 — Permisos excesivos:** si un candidato requiere acceso general a la
  navegación, interceptación amplia o un patrón equivalente a todas las URLs,
  queda fuera del soporte inicial aunque su potencial de usuarios sea alto.
- **EC-6 — Datos incompletos:** si una página solo expone título genérico,
  identificador ambiguo o progreso no fiable, la detección esperada es degradar
  sin afirmar un medio válido.
- **EC-7 — Empate de puntuación:** los empates de plataforma se resuelven por
  permisos y después estabilidad; los de navegador, por viabilidad y después
  alcance.
- **EC-8 — Fixture sensible:** cualquier fixture con cookies, tokens, datos de
  cuenta, historial personal o contenido no necesario se considera inválido.
- **EC-9 — Cambio de DOM:** una variación de DOM no cubierta debe quedar como
  limitación conocida o adaptador degradado hasta obtener nueva evidencia.
- **EC-10 — Restricción de licencia:** el benchmark puede describir patrones y
  citar fuentes de MAL-Sync, pero no copia su código GPL ni sus marcas o
  arquitectura interna en GlyphLog.

## Fuera de alcance

- ❌ Añadir o modificar adaptadores.
- ❌ Cambiar reintentos, detección SPA o lógica del content script.
- ❌ Cambiar permisos o patrones del manifest.
- ❌ Implementar los fixtures o E2E definidos para la issue #68.
- ❌ Publicar la extensión en stores o añadir builds de otros navegadores.
- ❌ Validar mediante automatización contra cuentas reales, DRM o datos privados.

## Criterios de salida

- [x] El contrato documental y sus resultados observables están definidos.
- [x] API contract indicado explícitamente como N/A.
- [x] Schemas Pydantic indicados explícitamente como N/A.
- [x] Data models y migraciones indicados explícitamente como N/A.
- [x] Edge cases enumerados y convertibles en casos binarios.
- [x] Sin detalles de archivos, clases, mocks, fixtures concretos ni frameworks.
- [x] Requisitos y edge cases tienen identificadores estables `RF-*`/`EC-*`.
- [x] El test design puede escribirse solo leyendo esta spec.
