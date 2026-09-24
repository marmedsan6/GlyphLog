# Itinerario de AI Engineering aplicado — GlyphLog

> **Estado:** en-progreso
> **Prioridad:** alta
> **Dependencias:** ninguna

## Propósito

Este índice organiza el itinerario de aprendizaje de AI Engineer aplicado
acordado para GlyphLog. El recorrido combina comprensión del sistema existente,
implementación gradual, evaluación reproducible, seguridad, RAG y portfolio.

La dedicación de referencia es de 8–10 horas semanales y el progreso se mide
por gates de aprendizaje, no por calendario. La estimación total es de 160–200
horas. El presupuesto máximo para invocaciones reales de Claude en Bedrock es
de 100 USD; los tests normales deben usar mocks.

## Orden y estado

| Orden | Hito | Documento | Dependencias | Estado |
| ----: | ---- | --------- | ------------ | ------ |
| 0 | Mapa de AI engineering en GlyphLog | [`DOCS-ai-engineer-hito-0.md`](DOCS-ai-engineer-hito-0.md) | ninguna | en-progreso |
| 1 | Fundamentos LLM y Bedrock | [`DOCS-ai-engineer-hito-1-llm-bedrock.md`](DOCS-ai-engineer-hito-1-llm-bedrock.md) | Hito 0 | backlog |
| 2 | Structured outputs y pipelines robustos | [`DOCS-ai-engineer-hito-2-structured-outputs.md`](DOCS-ai-engineer-hito-2-structured-outputs.md) | Hito 1 | backlog |
| 3 | Evaluation engineering | [`DOCS-ai-engineer-hito-3-evaluation.md`](DOCS-ai-engineer-hito-3-evaluation.md) | Hito 2 | backlog |
| 4 | Agentes fiables y seguros | [`DOCS-ai-engineer-hito-4-agents-safety.md`](DOCS-ai-engineer-hito-4-agents-safety.md) | Hito 3 | backlog |
| 5 | Miniapp RAG evaluada | [`DOCS-ai-engineer-hito-5-rag-miniapp.md`](DOCS-ai-engineer-hito-5-rag-miniapp.md) | Hito 3 y Hito 4 | backlog |
| 6 | Observabilidad, coste y operación | [`DOCS-ai-engineer-hito-6-observability-cost.md`](DOCS-ai-engineer-hito-6-observability-cost.md) | Hito 4 y Hito 5 | backlog |
| 7 | Portfolio e entrevistas | [`DOCS-ai-engineer-hito-7-portfolio.md`](DOCS-ai-engineer-hito-7-portfolio.md) | Hito 6 | backlog |

## Cómo usar las tareas

1. Completar los ejercicios y el gate del hito anterior.
2. Cambiar el estado del documento actual a `en-progreso`.
3. Trabajar en slices pequeños con tests y documentación.
4. Registrar baseline, resultados, errores y decisiones.
5. Marcar `completada` solo cuando todos los criterios de aceptación tengan evidencia.

No se deben ejecutar llamadas pagadas desde CI. Las evaluaciones con Bedrock se
ejecutan manualmente sobre datasets pequeños y con el presupuesto registrado.
