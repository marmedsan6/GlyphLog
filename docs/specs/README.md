# Especificaciones — GlyphLog

Esta carpeta contiene las specs de comportamiento que preceden al test design, al gate de planificación y al task doc. SDD es opcional y solo se activa tras petición explícita del usuario o propuesta aceptada.

## Flujo

```text
idea
→ routing y aprobación de SDD
→ spec
→ test design
→ gate de planificación en Plan mode
→ task doc
→ Red → Green → Refactor
→ validación y cierre
```

Plan mode es el gate donde se contrasta spec + test design con el código real y se decide el enfoque técnico. No produce un archivo `PLAN-*`; el task doc conserva el resultado.

## Tiers

| Tier | Uso                                           | Spec                       | Test design |
| ---- | --------------------------------------------- | -------------------------- | ----------- |
| 1    | Fix trivial, refactor mecánico o ajuste menor | No                         | No separado |
| 2    | Feature pequeña y acotada                     | `TEMPLATE-SPEC-COMPACT.md` | Compacto    |
| 3    | Feature grande o integración                  | `TEMPLATE-SPEC.md`         | Completo    |

Tier 2 y Tier 3 usan `docs/specs/SPEC-<slug>.md` y `docs/test-specs/TEST-SPEC-<slug>.md` como artefactos independientes creados antes del task doc.

Las features ya implementadas antes de ADR-017 no se migran retroactivamente: deben marcar spec/task como implementadas y documentar `Test design: N/A — histórica pre-ADR-017`. Ninguna tarea activa nueva puede usar esta excepción.

## Procedimiento

1. Confirmar que el usuario pidió o aceptó SDD.
2. Resolver dudas materiales sobre problema, alcance y comportamiento; mostrar cualquier inconsistencia importante.
3. Crear la spec adecuada al Tier y asignar IDs `RF-*` y `EC-*`.
4. Marcar la spec `en-revision` cuando permita diseñar tests solo con su contenido.
5. Crear el test design desde `docs/test-specs/TEMPLATE-TEST-SPEC.md`, sin consultar el código para decidir los resultados esperados.
6. Trazar cada `RF-*`/`EC-*` testeable a uno o más `TC-*`.
7. Entrar en Plan mode y revisar spec + test design + código real. Preguntar las dudas materiales detectadas.
8. Si se aprueban, marcar ambos artefactos `aprobada` y crear el task doc. Si se rechazan, corregir primero el artefacto de origen.
9. Implementar cada comportamiento con Red → Green → Refactor.
10. Validar, actualizar estados/backlog, guardar sesión y descubrimientos en Engram y crear ADR solo si hubo decisión arquitectónica.

## Estados

| Estado         | Significado                            |
| -------------- | -------------------------------------- |
| `borrador`     | En escritura                           |
| `en-revision`  | Lista para derivar/revisar test design |
| `aprobada`     | Spec y test design superaron el gate   |
| `implementada` | Comportamiento implementado y validado |

## Auditoría SDD

1. ¿SDD tuvo aprobación explícita?
2. ¿Se preguntaron las dudas materiales y se mostraron las inconsistencias importantes?
3. ¿Tier 2/3 tienen spec y test design independientes creados antes del task doc?
4. ¿Cada requisito y edge case testeable tiene ID y traza a un `TC-*`?
5. ¿Los oráculos del test design provienen de la spec y no del código?
6. ¿Plan mode revisó spec + test design sin crear un plan redundante?
7. ¿El task doc enlaza ambos artefactos y conserva las decisiones técnicas del gate?
8. ¿Cada comportamiento nuevo tiene evidencia Red anterior al código y Green posterior?
9. ¿Refactors y cambios no ejecutables usan la excepción correcta?
10. ¿La trazabilidad `RF/EC → TC → test ejecutable → código → resultado` está completa?
11. ¿Estados y backlog están actualizados?
12. ¿La sesión/descubrimientos fueron a Engram y las decisiones arquitectónicas al ADR?

## Archivos

- `TEMPLATE-SPEC-COMPACT.md`: spec Tier 2.
- `TEMPLATE-SPEC.md`: spec Tier 3.
- `SPEC-<slug>.md`: spec individual.
- [`SPEC-companion-compatibility.md`](./SPEC-companion-compatibility.md): compatibilidad verificable de Companion (#66).
- [`SPEC-companion-install.md`](./SPEC-companion-install.md): instalación guiada y distribución de Companion (#67).
- `../test-specs/TEMPLATE-TEST-SPEC.md`: test design Tier 2/3.
