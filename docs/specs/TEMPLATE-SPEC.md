# [SPEC] Título descriptivo de la especificación

> **Estado:** borrador | en-revision | aprobada | implementada
> **Prioridad:** alta | media | baja
> **Dependencias:** ninguna | [SPEC-X]
> **Test design derivado:** (se rellena antes del gate: `docs/test-specs/TEST-SPEC-<slug>.md`)
> **Task derivado:** (se rellena al aprobar: `docs/tasks/<TIPO>-<slug>.md`)

## Contexto

¿Qué existe actualmente? ¿Qué antecede a esta especificación? ¿Qué problema resuelve?

## Objetivo

¿Qué se quiere conseguir? Una frase clara.

## Requisitos funcionales

Historias de usuario en formato _Como / Quiero / Para_. Nivel comportamiento, no código.

- **RF-1** — Como usuario, quiero X para poder Y.
- **RF-2** — Como usuario, quiero Z para poder W.

## API contract

Contrato exhaustivo: endpoint, método, request y response completos, status codes y **todos los errores posibles**. Sin implementación.

### Endpoint

```
MÉTODO /api/v1/<ruta>
```

### Request

| Campo | Tipo | Obligatorio | Descripción |
| ----- | ---- | ----------- | ----------- |
|       |      |             |             |

### Response

| Status | Body |
| ------ | ---- |
| `200`  | ...  |
| `422`  | ...  |

### Errores

| Status | Cuándo                     | Body |
| ------ | -------------------------- | ---- |
| `401`  | Sin token o token inválido | ...  |
| `404`  | Recurso inexistente        | ...  |

## Schemas Pydantic

Campos, tipos, validaciones y ejemplos de cada schema de request/response. A nivel de campo, no solo nombres.

```python
class EjemploResponse(BaseModel):
    id: UUID
    title: str = Field(min_length=1, max_length=200)
```

## Data models

Tablas nuevas o alteradas, columnas, relaciones y migraciones Alembic necesarias.

| Tabla | Columna | Tipo | Restricciones |
| ----- | ------- | ---- | ------------- |
|       |         |      |               |

## Edge cases

Los "¿y si...?" que el código deberá manejar explícitamente. Cada uno debe poder convertirse en un test.

- **EC-1** — Config ausente (ej: API key) → comportamiento degradado con status concreto.
- **EC-2** — Datos vacíos o nulos en campos críticos → resultado esperado.
- **EC-3** — Rate limit / quota agotada → resultado esperado.
- **EC-4** — Caché: TTL, invalidación o fallo de backend → resultado esperado.

## Fuera de alcance

Explícitamente lo que NO se hace en esta spec. Evita scope creep.

- ❌ ...
- ❌ ...

## Criterios de salida

Checklist de auto-revisión **antes** de someter la spec a aprobación. Si algún checkbox no se puede marcar, la spec no está lista.

- [ ] API contract completo: endpoint, request, response, status codes y errores definidos.
- [ ] Schemas Pydantic a nivel de campo, con tipos y validaciones.
- [ ] Data models definidos (tablas, columnas, relaciones, migraciones).
- [ ] Edge cases enumerados y convertibles en tests.
- [ ] Sin implementación ni detalles de plan (los "cómo" van al plan, no a la spec).
- [ ] Requisitos y edge cases tienen identificadores estables `RF-*`/`EC-*`.
- [ ] El test design `TC-*` puede escribirse solo leyendo esta spec.
- [ ] No contiene archivos, clases, mocks ni decisiones propias de Plan mode.
