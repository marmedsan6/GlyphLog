# Test design — GlyphLog

Esta carpeta contiene el comportamiento testeable derivado de una spec **antes** del gate de planificación y antes de conocer la implementación.

## Flujo

```text
spec → test design → gate en Plan mode → task doc → Red → Green → Refactor → validación
```

El test design define el **qué comprobar** y su oráculo observable. El task doc posterior decide **cómo automatizarlo** y en qué nivel (unitario, integración, componente o E2E).

## Reglas

1. Crear `TEST-SPEC-<slug>.md` desde `TEMPLATE-TEST-SPEC.md` para todo SDD Tier 2 o Tier 3.
2. Derivarlo solo de una spec en estado `en-revision`; no consultar código de producción para decidir el resultado esperado.
3. Trazar cada requisito `RF-*` y edge case `EC-*` relevante a uno o más casos `TC-*`.
4. No incluir archivos de producción, clases internas, mocks, fixtures ni frameworks.
5. Aprobar spec y test design juntos en Plan mode antes de crear el task doc.
6. Durante la implementación, enlazar el test ejecutable a su `TC-*`, observar Red y solo entonces escribir el código mínimo para Green.

## Profundidad por Tier

- **Tier 2:** casos compactos para el flujo principal, errores y límites relevantes.
- **Tier 3:** cobertura completa de reglas, errores, seguridad, permisos, integraciones y degradación.

## Excepciones

- **Bug Tier 1:** test de regresión rojo antes del fix, sin test design separado.
- **Refactor puro:** tests de caracterización verdes antes y después; no se fuerza un Red artificial.
- **Documentación/configuración no ejecutable:** validaciones específicas en lugar de TDD simulado.

## Ejemplos

- [`EXAMPLE-TIER-2.md`](./EXAMPLE-TIER-2.md): flujo compacto con trazabilidad completa.
- [`EXAMPLE-TIER-3.md`](./EXAMPLE-TIER-3.md): flujo formal con errores, atomicidad y decisiones del gate.
