# [TEST-SPEC] Título descriptivo

> **Estado:** borrador | en-revision | aprobada | implementada
> **Tier:** 2 | 3
> **Spec origen:** [`docs/specs/SPEC-<slug>.md`](../specs/SPEC-<slug>.md)
> **Task derivado:** (se rellena al aprobar: `docs/tasks/<TIPO>-<slug>.md`)

## Alcance observable

Qué comportamiento se verificará y qué queda fuera. No describir implementación.

## Matriz de trazabilidad

| Origen | Casos | Cobertura esperada |
| ------ | ----- | ------------------ |
| RF-1   | TC-01 | Flujo principal    |
| EC-1   | TC-02 | Error/límite       |

## Casos de prueba

### TC-01 — Nombre del comportamiento

- **Origen:** RF-1
- **Prioridad:** P0 | P1 | P2
- **Precondiciones:** estado observable necesario.
- **Dado:** contexto inicial.
- **Cuando:** acción o estímulo.
- **Entonces:** resultado observable y binario.
- **Datos límite:** valores o particiones relevantes.

### TC-02 — Nombre del error o límite

- **Origen:** EC-1
- **Prioridad:** P0 | P1 | P2
- **Precondiciones:** estado observable necesario.
- **Dado:** contexto inicial.
- **Cuando:** acción o estímulo.
- **Entonces:** error, estado o mensaje esperado.

## Preguntas abiertas

Toda duda material debe resolverse con el usuario antes del gate. Si no hay, escribir `Ninguna`.

## Criterios de salida

- [ ] Cada `RF-*` y `EC-*` testeable aparece en la matriz.
- [ ] Cada caso tiene precondición, estímulo y resultado observable.
- [ ] Los resultados esperados provienen solo de la spec.
- [ ] No contiene archivos, clases, mocks, fixtures ni frameworks.
- [ ] Los casos pueden fallar por una implementación incorrecta aunque esta sea internamente consistente.
- [ ] Las preguntas materiales están resueltas.
