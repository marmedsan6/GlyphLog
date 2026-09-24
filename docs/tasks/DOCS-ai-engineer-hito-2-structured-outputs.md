# [DOCS] Hito 2 — Structured outputs y pipelines robustos

> **Estado:** backlog
> **Prioridad:** alta
> **Dependencias:** [`DOCS-ai-engineer-hito-1-llm-bedrock.md`](DOCS-ai-engineer-hito-1-llm-bedrock.md)

## Contexto

Las recomendaciones y las importaciones dependen de respuestas JSON de un LLM.
Actualmente se intenta extraer JSON del texto y después se valida cada entrada.
La importación además divide el contenido en chunks y conserva advertencias por
bloque.

## Objetivo

Diseñar fronteras deterministas entre salida probabilística y lógica de negocio,
con schemas, errores clasificados, chunking verificable, deduplicación e
idempotencia.

## Especificación

### Dataset mínimo

- 20 importaciones: listas pequeñas, grandes, partidas, duplicados, Unicode,
  cabeceras MAL/AniList, campos ausentes y contenido inválido.
- 10 recomendaciones: colección insuficiente, géneros vacíos, tipo filtrado,
  campos extra, JSON envuelto en Markdown y elementos inválidos.

Cada caso debe indicar entrada, resultado esperado, campos obligatorios y
categoría de error.

### Comportamiento requerido

- Todas las salidas aceptadas pasan por Pydantic.
- Una respuesta no JSON no se trata como éxito parcial silencioso.
- Un chunk fallido no elimina los chunks válidos restantes.
- La ejecución repetida con el mismo identificador no duplica importaciones.
- Los errores de proveedor, parseo, schema y negocio son distinguibles.
- La validación no confía únicamente en que el texto “parezca razonable”.

## Test design

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01 | Respuesta JSON válida construye el schema esperado | unitario |
| TC-02 | JSON inválido produce error clasificable | unitario |
| TC-03 | Campos extra, ausentes y tipos erróneos | unitario |
| TC-04 | Un chunk fallido conserva los demás en orden | integración |
| TC-05 | Importación repetida no crea duplicados | integración |
| TC-06 | Recomendaciones inválidas no rompen el resto del lote | unitario |
| TC-07 | Comparación baseline frente a salida estructurada mejorada | evaluación |

## Decisiones de Plan mode

- **Enfoque técnico:** mantener el contrato de dominio independiente del
  proveedor; el proveedor solo genera una estructura candidata.
- **Capas afectadas:** `RecommendationService`, `ImportService`, clientes LLM,
  schemas y tests.
- **Orden:** caracterización actual → dataset → validación → retries selectivos
  → métrica comparativa.
- **Riesgos:** reintentos que multiplican coste, respuestas truncadas y pérdida de
  orden; mitigación mediante límites y claves idempotentes.

## Tareas técnicas

- [ ] Inventariar todos los schemas de recomendación, importación y YouTube.
- [ ] Añadir casos JSONL con expected output y expected error.
- [ ] Medir baseline de validez, pérdida de elementos y coste.
- [ ] Definir la frontera de structured output para una feature piloto.
- [ ] Implementar retries solo para errores recuperables.
- [ ] Añadir idempotencia y pruebas de repetición.
- [ ] Documentar cuándo conviene schema nativo, tool calling o extracción textual.

## Criterios de aceptación

- ✅ 100 % de las respuestas aceptadas pasan validación de schema.
- ✅ Los cuatro tipos de error se distinguen en tests.
- ✅ La importación parcial conserva orden y warnings.
- ✅ Repetir una operación no duplica datos.
- ✅ Existe comparación cuantitativa con el baseline.
- ✅ Los tests normales no llaman a Bedrock.

## Notas técnicas

No se debe cambiar toda la arquitectura de LLM por una abstracción genérica antes
de medir el contrato real. El objetivo educativo es observar dónde se necesita
determinismo y dónde sigue siendo aceptable la variabilidad del modelo.

## Archivos relevantes

- `apps/api/app/services/import_service.py`
- `apps/api/app/services/recommendation_service.py`
- `apps/api/app/integrations/llm.py`
- `apps/api/app/integrations/bedrock/client.py`
- `apps/api/tests/services/test_import_service_chunking.py`
- `apps/api/tests/services/test_recommendation_service.py`
