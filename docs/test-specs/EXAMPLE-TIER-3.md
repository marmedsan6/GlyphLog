# Ejemplo Tier 3 — Importar colección externa

> Ejemplo didáctico; no representa una tarea activa.

## 1. Spec formal resumida

**Objetivo:** importar entradas desde un archivo exportado por un proveedor externo sin crear duplicados.

- **RF-1:** aceptar un archivo válido y devolver cantidades importadas, omitidas y fallidas.
- **RF-2:** conservar título, tipo y estado de cada entrada válida.
- **EC-1:** archivo corrupto → error `422` sin escrituras parciales.
- **EC-2:** entrada ya existente → omitirla y contabilizarla como duplicada.
- **EC-3:** tipo externo desconocido → contabilizar el registro como fallido sin abortar los válidos.
- **Fuera de alcance:** sincronización continua y resolución manual de conflictos.

## 2. Test design previo al plan

| Origen | Caso | Resultado observable |
| ------ | ---- | -------------------- |
| RF-1, RF-2 | TC-01 | Resumen correcto y entradas válidas disponibles |
| EC-1 | TC-02 | `422`, cero escrituras y mensaje claro |
| EC-2 | TC-03 | Duplicado omitido y contabilizado |
| EC-3 | TC-04 | Registro inválido aislado; válidos importados |

### TC-01 — Importación válida

- **Dado:** un archivo con dos entradas válidas y una colección vacía.
- **Cuando:** el usuario solicita la importación.
- **Entonces:** el resultado informa `imported=2`, `skipped=0`, `failed=0` y ambas entradas quedan disponibles con sus valores originales.

### TC-02 — Archivo corrupto

- **Dado:** un archivo que no puede interpretarse.
- **Cuando:** el usuario solicita la importación.
- **Entonces:** recibe `422`, un mensaje accionable y la colección permanece sin cambios.

### TC-03 — Duplicado

- **Dado:** una entrada ya existente y el mismo elemento en el archivo.
- **Cuando:** se importa el archivo.
- **Entonces:** no aparece una segunda copia y el resultado informa `skipped=1`.

### TC-04 — Registro inválido aislado

- **Dado:** un archivo con una entrada válida y otra de tipo desconocido.
- **Cuando:** se importa el archivo.
- **Entonces:** la válida se importa, la inválida no y el resultado informa `imported=1`, `failed=1`.

## 3. Gate en Plan mode

- **Aprobación:** todos los requisitos y edge cases tienen oráculo independiente.
- **Decisiones persistidas en el task:** separar parser, service y repository; cubrir atomicidad en integración y reglas de duplicado en service.
- **Inconsistencia que se rechazaría:** un test design que nombre clases, mocks o una transacción concreta antes del gate.

## 4. Tasks TDD

1. **Red TC-02:** integración que demuestre `422` y cero escrituras.
2. **Green TC-02:** validación mínima del archivo.
3. **Red/Green TC-03:** regla de duplicados en service.
4. **Red/Green TC-01 y TC-04:** importación y aislamiento de registros inválidos.
5. **Refactor:** consolidar parser/service/repository manteniendo toda la suite verde.

## 5. Trazabilidad

```text
RF-1/RF-2 → TC-01 → integración → importación → resumen y datos persistidos
EC-1 → TC-02 → integración → validación/atomicidad → 422 sin cambios
EC-2 → TC-03 → service → deduplicación → skipped=1
EC-3 → TC-04 → service/integración → aislamiento → importación parcial controlada
```
