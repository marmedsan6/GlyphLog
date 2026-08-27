---
name: sdd
description: "Orquesta el flujo Specification-Driven Development opcional de GlyphLog: propuesta y aprobación explícita → tier → spec → test design independiente → gate de planificación en Plan mode → task doc → TDD Red/Green/Refactor → validación → cierre. Usar cuando el usuario pide SDD o acepta una propuesta de SDD para trabajo con ambigüedad sustancial o que se beneficia de artefactos durables. Nunca activar SDD silenciosamente por ser una feature nueva."
---

# SDD en GlyphLog

Orquestar SDD sin duplicar las skills de historias, QA, review o deploy. La spec define el comportamiento; el test design define cómo demostrarlo sin conocer la implementación; Plan mode decide el enfoque técnico; el task doc conserva esa planificación.

## Reglas no negociables

1. **SDD es opcional.** Proponerlo cuando reduzca incertidumbre y activarlo solo tras petición explícita o aceptación del usuario.
2. **Preguntar toda duda material.** No asumir silenciosamente alcance, comportamiento, arquitectura, datos o seguridad. Exponer siempre las inconsistencias importantes.
3. **Plan mode es un gate, no un archivo.** No crear `PLAN-*.md`; persistir el resultado técnico en el task doc.
4. **Test design antes del plan.** Derivarlo solo de la spec, sin consultar la solución de producción para decidir el oráculo.
5. **TDD durante la implementación.** Para comportamiento nuevo: Red observado → código mínimo → Green → Refactor.

## Flujo

```text
idea
→ routing y aprobación de SDD
→ tier
→ spec
→ test design
→ gate de planificación en Plan mode
→ task doc
→ Red → Green → Refactor
→ validación
→ cierre
```

## Fase 0 — Routing, dudas y aprobación

1. Capturar en máximo diez líneas:
   - problema y usuario afectado;
   - resultado observable;
   - motivo y alcance.
2. Revisar contexto mediante quick-context, Engram y codebase-memory; confirmar las skills disponibles.
3. Identificar dudas, supuestos y contradicciones materiales. Resolver primero por comprobaciones de solo lectura; preguntar al usuario lo que siga abierto.
4. Elegir la ruta más pequeña de AGENTS.md §6.6:
   - directa inline;
   - directa delegada;
   - SDD opcional.
5. Si SDD aporta valor, explicar el overhead y pedir aprobación. Detener el flujo SDD hasta recibirla.

Para una feature nueva puede usarse `user-story` como captura INVEST y tracking en GitHub Project #2, pero no sustituye la spec.

## Fase 1 — Decidir Tier

| Tier | Uso | Artefactos |
| ---- | --- | ---------- |
| 1 | Fix trivial, refactor mecánico o ajuste menor | Sin spec ni test design separados |
| 2 | Feature pequeña y comportamiento acotado | Spec compacta + test design compacto |
| 3 | Feature grande, auth, importación, descubrimiento o integración | Spec formal + test design completo |

Si el Tier cambia el overhead o no está claro, preguntar antes de crear archivos.

### Tier 1

- **Bug:** reproducir → escribir regresión → observar Red → fix mínimo → Green.
- **Refactor puro:** ejecutar/añadir caracterización verde → refactor → confirmar verde. No forzar un Red artificial.
- **Docs/config no ejecutable:** definir y ejecutar validaciones específicas.

## Fase 2 — Escribir la spec

### Tier 2

Crear `docs/specs/SPEC-<slug>.md` desde `docs/specs/TEMPLATE-SPEC-COMPACT.md`. La spec ya no vive dentro del task doc.

### Tier 3

Crear `docs/specs/SPEC-<slug>.md` desde `docs/specs/TEMPLATE-SPEC.md` y completar contexto, requisitos, contratos, schemas, data models, edge cases y fuera de alcance.

Para ambos Tiers:

- usar identificadores `RF-*` y `EC-*` estables;
- expresar resultados observables, no implementación;
- marcar la spec como `en-revision` cuando pueda alimentar test design;
- comprobar que pueden diseñarse tests leyendo solo la spec;
- preguntar cualquier comportamiento ambiguo antes de continuar.

## Fase 3 — Crear test design

Crear `docs/test-specs/TEST-SPEC-<slug>.md` desde `docs/test-specs/TEMPLATE-TEST-SPEC.md`.

1. Leer la spec, no el código de producción, para decidir resultados esperados.
2. Trazar cada `RF-*` y `EC-*` relevante a casos `TC-*`.
3. Definir precondición, estímulo y resultado observable/binario.
4. No decidir archivos, clases internas, mocks, fixtures, framework ni nivel de test; esas decisiones pertenecen al gate y al task doc.
5. Tier 2 usa cobertura compacta; Tier 3 cubre reglas, errores, permisos, seguridad, integraciones y degradación.

Si aparece una inconsistencia entre spec y test design, detenerse, mostrarla y pedir decisión. Corregir primero la spec y regenerar el caso afectado.

## Fase 4 — Gate de planificación en Plan mode

Entrar en Plan mode para revisar **spec + test design + código real**. Plan mode no produce un documento separado.

El gate debe verificar:

- requisitos completos y sin contradicciones;
- todos los `RF-*`/`EC-*` testeables cubiertos por `TC-*`;
- oráculos independientes de la implementación;
- compatibilidad con arquitectura y código existentes;
- riesgos, dependencias y orden de trabajo;
- dudas materiales resueltas con el usuario.

Resultados:

- **Aprobado:** marcar spec y test design como `aprobada`; continuar.
- **Rechazado:** volver al artefacto que contiene el defecto. No crear task doc.

## Fase 5 — Crear task doc

Solo tras aprobar spec y test design:

1. Crear `docs/tasks/<TIPO>-<slug>.md` desde `docs/tasks/TEMPLATE.md`.
2. Enlazar spec y test design.
3. Persistir las decisiones de Plan mode: enfoque, capas, dependencias, riesgos y archivos previstos.
4. Incluir matriz `TC-* → test ejecutable previsto`.
5. Ordenar cada slice como test primero y producción después.
6. Añadir la tarea a `docs/tasks/backlog.md`.
7. Rellenar los enlaces de task derivado en spec y test design.

## Fase 6 — Implementar con TDD

Para cada comportamiento nuevo:

1. **Red:** escribir el test enlazado a `TC-*`, ejecutarlo y confirmar que falla por ausencia o incorrección del comportamiento. Un fallo de setup no cuenta.
2. **Green:** escribir el código mínimo para pasarlo respetando la arquitectura.
3. **Refactor:** mejorar estructura sin alterar comportamiento y mantener todos los tests verdes.
4. Marcar las tareas completadas con evidencia breve de Red/Green.

Backend:

```text
Router → Service → Repository → Base de datos
```

Frontend:

```text
services → hooks → componentes
```

## Fase 7 — Validación y cierre

1. Ejecutar tests relevantes, lint, typecheck, build y E2E según riesgo.
2. Usar `thermo-nuclear-review` para revisión estricta cuando corresponda.
3. Confirmar trazabilidad completa:

```text
RF/EC → TC → test ejecutable → código → resultado
```

4. Marcar spec y test design como `implementada`; task como `completada`; actualizar backlog.
5. Guardar descubrimientos, bugs resueltos y resumen de sesión en Engram. No crear nuevas entradas en `memory-bank/sessions/`.
6. Añadir ADR en `memory-bank/decisions.md` solo si hubo decisión arquitectónica.
7. Si hay deploy, usar `deploy-to-prod`.

## Auditoría

- SDD tuvo aprobación explícita.
- Las dudas materiales y grandes inconsistencias se expusieron al usuario.
- Tier 2/3 tienen spec y test design independientes.
- Plan mode actuó como gate y no se creó un archivo de plan redundante.
- Cada requisito/edge case testeable traza a un `TC-*`.
- Cada comportamiento nuevo tiene evidencia Red antes del código y Green después.
- Refactors y cambios no ejecutables usan su excepción correcta.
- Estados, backlog, Engram y ADRs están actualizados.

## Anti-patrones

| Anti-patrón | Corrección |
| ----------- | ---------- |
| Activar SDD por defecto | Proponer y pedir aprobación |
| Resolver una duda material mediante suposición | Preguntar antes de escribir |
| Ocultar una contradicción no bloqueante | Mostrarla y explicar impacto |
| Crear `PLAN-*.md` | Usar Plan mode y persistir resultado en task doc |
| Diseñar tests desde el código | Derivarlos solo de spec |
| Implementar y luego añadir tests | Exigir Red antes de producción |
| Forzar Red en refactor puro | Usar caracterización verde antes/después |
| Crear sesiones en Memory Bank | Guardar sesión y descubrimientos en Engram |
