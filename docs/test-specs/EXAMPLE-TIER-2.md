# Ejemplo Tier 2 — Filtrar colección por estado

> Ejemplo didáctico; no representa una tarea activa.

## 1. Spec compacta

**Objetivo:** permitir filtrar la colección por un único estado sin recargar la página.

- **RF-1:** al elegir `completed`, mostrar solo entradas con ese estado.
- **EC-1:** si no existen coincidencias, mostrar un estado vacío claro.
- **Fuera de alcance:** combinar varios estados o persistir el filtro en la URL.

## 2. Test design previo al plan

| Origen | Caso | Resultado observable |
| ------ | ---- | -------------------- |
| RF-1 | TC-01 | Solo quedan visibles entradas `completed` |
| EC-1 | TC-02 | Se muestra “No tienes entradas en este estado” |

### TC-01

- **Dado:** una colección visible con una entrada `watching` y otra `completed`.
- **Cuando:** el usuario selecciona `completed`.
- **Entonces:** se muestra la entrada completada y se oculta la entrada en progreso.

### TC-02

- **Dado:** una colección sin entradas `dropped`.
- **Cuando:** el usuario selecciona `dropped`.
- **Entonces:** aparece el estado vacío definido y no se muestran tarjetas.

## 3. Gate en Plan mode

- **Aprobación:** RF-1 y EC-1 están cubiertos; los resultados no dependen de componentes ni funciones internas.
- **Decisión técnica persistida en el task:** automatizar TC-01/TC-02 como tests de componente; mantener filtrado en una función pura reutilizable.
- **Inconsistencia que se rechazaría:** “llamar a `filterEntriesByStatus()`” no es un resultado observable y contaminaría el test design con el plan.

## 4. Tasks TDD

1. **Red TC-01/TC-02:** escribir tests de componente y confirmar fallos por filtrado/estado vacío ausentes.
2. **Green:** implementar el filtro mínimo hasta pasar ambos casos.
3. **Refactor:** extraer la función pura si mejora claridad, manteniendo verde.

## 5. Trazabilidad

```text
RF-1 → TC-01 → test de componente → filtrado → resultado visible
EC-1 → TC-02 → test de componente → estado vacío → mensaje visible
```
