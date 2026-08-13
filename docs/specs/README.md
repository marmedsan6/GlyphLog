# Especificaciones — GlyphLog

Esta carpeta contiene las **especificaciones técnicas formales** del proyecto. Es la fase que antecede al plan: aquí se define **qué** se construye (contratos, schemas, modelos de datos, edge cases), antes de decidir **cómo** (plan → tareas → código).

## ¿Por qué specs?

En el flujo SDD (Specification-Driven Development) el orden es:

```
spec → plan → tasks → código → tests → validación
```

Cada fase se aprueba antes de pasar a la siguiente. La spec es el contrato revisable: las decisiones de diseño se toman y se aprueban **antes** de invertir horas de implementación. La regla de oro: _la spec está lista cuando puedes escribir los tests solo leyéndola._

## Cuándo usar cada nivel de especificación (Tiers)

| Tier | Cuándo                                                                      | Artefacto                                                                 |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | Fix trivial (< 10 min): typo, bug puntual                                   | Sin spec, directo al código                                               |
| 2    | Feature pequeña: un endpoint, un componente                                 | Sección `## Especificación` compacta dentro del task doc en `docs/tasks/` |
| 3    | Feature grande: auth, importaciones, descubrimiento, integraciones externas | Spec propia: `docs/specs/SPEC-<slug>.md` + gate de revisión               |

## Cómo escribir una spec (Tier 3)

1. Copia `TEMPLATE-SPEC.md` con el nombre `SPEC-<slug>.md` (p. ej. `SPEC-youtube-discovery.md`).
2. Rellena **todas** las secciones. No dejes secciones vacías: si no aplica, escribe `N/A`.
3. Marca los **Criterios de salida** al final. Si algún checkbox no se puede marcar, la spec no está lista.
4. Sométela a aprobación (ver flujo abajo). El estado va en la línea `> **Estado:**` de arriba.
5. Al aprobarla, se crea el task doc en `docs/tasks/` que **enlaza esta spec**, y se apunta en `> **Plan/Task derivado:**`.

## Flujo día a día al implementar una tarea

1. **Idea** → responde en el issue/backlog: ¿qué problema resuelve? ¿quién lo usa? ¿por qué ahora? (máx 10 líneas).
2. **Decide tier** (1/2/3 según la tabla de arriba).
3. **Escribe la spec** (Tier 3 en esta carpeta; Tier 2 inline en el task doc).
4. **Marca los Criterios de salida**. Si alguno queda sin marcar, sigue en la spec.
5. **Gate de aprobación**: entra en plan mode (`enter_plan_mode`) → el plan valida la spec contra el código real → aprueba/rechaza con la revisión del plan. La spec se rechaza si le falta contrato, esquema o edge cases.
6. **Solo tras aprobar**: crea el task doc en `docs/tasks/<TIPO>-<slug>.md` con `TEMPLATE.md`, añádelo a `docs/tasks/backlog.md` y apunta el enlace en la spec.
7. **Implementa** siguiendo la arquitectura (`router → service → repository`; en web: services → hooks → componentes). Cada criterio de aceptación traza a un requisito de la spec.
8. **Tests y validación**: pytest / Vitest+RTL / Playwright, sonar, lint, tsc, build.
9. **Cierra**: estado de la spec → `implementada`, actualiza `backlog.md`, crea sesión en `memory-bank/sessions/` y ADR si hubo decisión de arquitectura.

## Estados de una spec

| Estado         | Significado                                      |
| -------------- | ------------------------------------------------ |
| `borrador`     | En escritura, aún no sometida a aprobación       |
| `en-revision`  | Sometida a revisión (gate de plan mode)          |
| `aprobada`     | Aprobada; el plan/task puede derivarse           |
| `implementada` | El feature derivado está implementado y validado |

## Auditoría SDD — checklist

Ejecuta este checklist periódicamente (fin de milestone o sesión significativa) para comprobar que el proyecto sigue SDD estrictamente:

1. ¿Existe `docs/specs/` y se usa `TEMPLATE-SPEC.md` para Tier 3?
2. ¿Cada task doc tiene `## Especificación` rellena **antes** de `## Tareas técnicas`?
3. ¿Los Tier 3 referencian una spec en `docs/specs/` con estado `aprobada`/`implementada`?
4. ¿Las specs incluyen API contract, schemas, data models y edge cases (Criterios de salida marcados)?
5. ¿Ningún task doc mezcla spec + plan + implementación?
6. ¿Cada criterio de aceptación traza a un requisito de la spec?
7. ¿Los commits de features referencian task doc y spec?
8. ¿Toda decisión de arquitectura nueva tiene ADR en `memory-bank/decisions.md`?
9. ¿Hay sesión en `memory-bank/sessions/` tras trabajo significativo, con sección Validación?
10. ¿El gate (plan mode + Criterios de salida) se usó antes de generar tasks?

**Regla de trazabilidad:** spec → task doc → criterios de aceptación → código → tests. Si un eslabón falta, el flujo no es conforme.

## Archivos

| Archivo                                | Descripción                                            |
| -------------------------------------- | ------------------------------------------------------ |
| [TEMPLATE-SPEC.md](./TEMPLATE-SPEC.md) | Plantilla estándar para nuevas especificaciones        |
| `SPEC-<slug>.md`                       | Especificaciones individuales (una por feature Tier 3) |
