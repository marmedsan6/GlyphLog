# [DOCS] Compatibilidad verificable de GlyphLog Companion (#66)

> **Estado:** completada
> **Prioridad:** alta
> **Dependencias:** ninguna; prepara la issue #68

## Contexto

La extensión Companion ya detecta media en Crunchyroll, AnimeFLV y MangaDex,
pero la compatibilidad no está expresada como una promesa verificable. La issue
#66 solicita un benchmark de MAL-Sync, una matriz priorizada, una recomendación
de plataforma/navegador y contratos QA. Durante el análisis se detectaron
afirmaciones desactualizadas en ADR-010, el README y la guía de pruebas.

## Objetivo

Publicar una política de compatibilidad trazable y de permisos mínimos, junto
con la documentación que la issue #68 necesita para implementar regresiones.

## Especificación

**Spec:** [`docs/specs/SPEC-companion-compatibility.md`](../specs/SPEC-companion-compatibility.md) — estado `implementada`

**Contrato observable:** benchmark fechado y enlazado; matriz de siete
plataformas y cinco navegadores; puntuaciones reproducibles; MangaPlus como
siguiente plataforma; Edge como siguiente navegador; contratos de fixtures/E2E;
política explícita sin `<all_urls>`; documentación y ADR coherentes.

## Test design

**Test design:** [`docs/test-specs/TEST-SPEC-companion-compatibility.md`](../test-specs/TEST-SPEC-companion-compatibility.md) — estado `implementada`

## Informe publicado

[`docs/companion-compatibility.md`](../companion-compatibility.md) contiene el
benchmark MAL-Sync fijado, la matriz de plataformas/navegadores, la puntuación
reproducible, la política de permisos mínimos y los contratos de fixtures/E2E
para la issue #68.

### Matriz de automatización

| Caso  | Test ejecutable previsto                                           | Nivel                |
| ----- | ------------------------------------------------------------------ | -------------------- |
| TC-01 | Auditoría de enlaces y fechas en `docs/companion-compatibility.md` | documental           |
| TC-02 | Checklist del benchmark MAL-Sync y revisión de fuentes fijadas     | documental           |
| TC-03 | Revisión de filas/columnas del universo de compatibilidad          | documental           |
| TC-04 | Auditoría de estado, evidencia y fecha por fila                    | documental           |
| TC-05 | Recalculo independiente de puntuaciones de plataformas             | documental           |
| TC-06 | Recalculo independiente de puntuaciones de navegadores             | documental           |
| TC-07 | Revisión de recomendación MangaPlus                                | documental           |
| TC-08 | Revisión de recomendación Edge/Firefox/Safari                      | documental           |
| TC-09 | Checklist del contrato de fixtures                                 | QA/documental        |
| TC-10 | Revisión de sanitización y ausencia de secretos                    | seguridad/documental |
| TC-11 | Checklist del contrato E2E local                                   | QA/documental        |
| TC-12 | Auditoría de nivel fixture/E2E/manual                              | QA/documental        |
| TC-13 | Inspección del manifest generado y de la política de hosts         | build/seguridad      |
| TC-14 | Comparación ADR, README y guía de pruebas                          | documental           |
| TC-15 | Revisión de fuentes no verificables o contradictorias              | documental           |
| TC-16 | Auditoría de alcance mediante diff y archivos tocados              | revisión             |

## Decisiones de Plan mode

- **Enfoque técnico:** tratar la tarea como spike documental; fijar MAL-Sync en
  release `0.12.4` y commit de referencia; comparar patrones sin copiar código;
  calcular una puntuación explícita de 0–100.
- **Capas afectadas:** documentación SDD, informe de compatibilidad, guía de
  extensión, README y Memory Bank; ninguna capa runtime.
- **Dependencias y orden:** spec/test design aprobados → este task doc →
  saneamiento de fuentes de verdad → benchmark/matriz/contratos → validación.
- **Riesgos y mitigaciones:** fuentes cambiantes (URL + fecha + revisión
  fijada), restricciones regionales/DRM (manual), fixtures sensibles
  (sanitización), permisos amplios (rechazo explícito).
- **Archivos previstos:** `docs/companion-compatibility.md`,
  `docs/extension-testing-guide.md`, `apps/extension/README.md`,
  `memory-bank/decisions.md`, además de los artefactos SDD y el backlog.

## Tareas técnicas

- [x] Crear y aprobar la spec Tier 3 y el test design independiente.
- [x] Registrar la decisión de tracking: las inconsistencias forman parte de #66.
- [x] Crear el informe con benchmark, fuentes, matriz y recomendaciones.
- [x] Añadir el contrato documental de fixtures para la issue #68.
- [x] Añadir el contrato documental E2E y los niveles de evidencia.
- [x] Marcar ADR-010 como reemplazada y añadir la política vigente de permisos.
- [x] Corregir README y guía con hosts, adaptadores y tiempos reales.
- [x] Ejecutar validaciones documentales, tests, build y revisión estricta.
- [x] Cerrar #66 y mover su item del Project #2 a `Done` tras la evidencia.

Los cambios documentales no fuerzan un Red artificial. La excepción de SDD para
documentación se satisface con validaciones específicas y una auditoría de
alcance antes/después.

## Criterios de aceptación

- ✅ El informe incluye enlaces primarios y fecha de consulta `2026-08-26`.
- ✅ La matriz cubre las siete plataformas y cinco navegadores definidos en la spec.
- ✅ Los estados distinguen soporte implementado de soporte verificado.
- ✅ Las puntuaciones y desempates se pueden recalcular de forma independiente.
- ✅ MangaPlus y Edge aparecen como recomendaciones explícitas y justificadas.
- ✅ Fixtures y E2E tienen contratos reutilizables, sin secretos ni datos personales.
- ✅ ADR, README y guía describen los hosts y tiempos reales sin `<all_urls>`.
- ✅ No se modifican adaptadores, reintentos, manifest, API, schemas ni BD.
- ✅ Prettier, tests de la extensión, build y revisión de fuentes pasan.
- ✅ Cada `RF/EC` traza a `TC`, validación y resultado.

## Notas técnicas

- Fuentes base: repositorio y release oficiales de MAL-Sync, documentación de
  Chrome/MDN/WXT/Brave, fuentes oficiales de cada plataforma y StatCounter para
  la señal de alcance de navegadores.
- La recomendación no autoriza todavía un nuevo adaptador ni un cambio de
  permisos; cualquier incorporación futura requiere su propia implementación,
  validación y revisión de allowlist.
- Si una fuente deja de estar disponible, el informe conserva la afirmación como
  `no verificada` y registra la limitación.

## Revisiones de calidad

- **qa-senior (2026-08-26):** el test design mantiene los oráculos derivados de
  la spec, separa fixture/E2E/manual, cubre errores y datos incompletos, y
  exige perfiles/servicios locales sin secretos. Sin blockers.
- **thermo-nuclear-review (2026-08-26):** el cambio es documental, no añade
  ramas, wrappers ni abstracciones runtime y no cruza el umbral de 1.000 líneas
  en ningún archivo tocado. La única decisión persistente nueva queda aislada
  en ADR-018. Sin regresiones estructurales observadas.

**Limitación de cierre:** las herramientas `mem_*` de Engram no están
disponibles en esta sesión. Se reintentó su descubrimiento y se registra aquí
la limitación; no se crea una sesión manual en `memory-bank/sessions/`.

## Archivos relevantes

- `docs/companion-compatibility.md`
- `docs/specs/SPEC-companion-compatibility.md`
- `docs/test-specs/TEST-SPEC-companion-compatibility.md`
- `docs/extension-testing-guide.md`
- `apps/extension/README.md`
- `memory-bank/decisions.md`
- `docs/tasks/backlog.md`
