# [DOCS] Hito 3 — Evaluation engineering

> **Estado:** backlog
> **Prioridad:** alta
> **Dependencias:** [`DOCS-ai-engineer-hito-2-structured-outputs.md`](DOCS-ai-engineer-hito-2-structured-outputs.md)

## Contexto

Los tests existentes prueban contratos de software y mocks, pero no responden
si un cambio de prompt, modelo o tool mejora la calidad de las respuestas. Hace
falta un dataset versionado y un harness capaz de comparar baseline y candidato.

## Objetivo

Crear un sistema de evaluación reproducible que mida corrección estructural,
selección de tools, groundedness, task success, coste y latencia sin convertir
cada ejecución de CI en una llamada pagada.

## Especificación

### Formato de caso

Cada línea JSONL debe tener:

```json
{
  "id": "chat-001",
  "feature": "chat|recommendation|import|agent",
  "input": {},
  "reference": {},
  "expected_tools": [],
  "tags": ["happy-path"],
  "evaluators": ["schema", "authorization"]
}
```

### Dataset inicial

- 10 preguntas sobre colección y contexto.
- 10 selecciones de tools y argumentos.
- 10 recomendaciones con restricciones.
- 10 importaciones con errores y duplicados.

### Evaluadores

- Deterministas: schema, campos obligatorios, tool, argumentos, permisos,
  reglas de negocio y abstención.
- Humanos: referencia de respuesta, casos ambiguos y calidad subjetiva.
- LLM-as-judge: únicamente claridad, utilidad o equivalencia semántica, con
  rúbrica y muestra calibrada manualmente.

## Test design

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01 | Dataset se carga y valida contra su schema | unitario |
| TC-02 | Evaluador de schema produce score determinista | unitario |
| TC-03 | Evaluador de tool detecta tool y argumentos incorrectos | unitario |
| TC-04 | Runner compara baseline y candidato | integración |
| TC-05 | Una regresión superior al 5 % hace fallar el gate | integración |
| TC-06 | Informe conserva coste, tokens, latencia y versión de prompt | integración |
| TC-07 | Muestra de judge coincide con revisión humana calibrada | manual |

## Decisiones de Plan mode

- **Enfoque técnico:** harness propio basado en JSONL y pytest; servicios SaaS
  son opcionales, no una dependencia del proyecto.
- **Capas afectadas:** tests, datasets, servicios de IA y documentación.
- **Orden:** evaluadores deterministas → baseline → comparación → judge calibrado.
- **Riesgos:** métricas engañosas, contaminación del dataset y coste inesperado;
  mitigación mediante versionado, holdout y límites de ejecución.

## Tareas técnicas

- [ ] Crear el schema de casos y validarlo.
- [ ] Construir los 40 casos iniciales y etiquetar su dificultad.
- [ ] Implementar runner offline con respuestas mockeadas.
- [ ] Añadir ejecución real manual sobre una muestra pequeña.
- [ ] Definir baseline, umbrales y formato de informe.
- [ ] Revisar manualmente al menos 20 casos antes de usar judge.
- [ ] Añadir un caso fallido real al dataset por cada bug encontrado.

## Criterios de aceptación

- ✅ Existe un comando reproducible para ejecutar el dataset.
- ✅ Los tests deterministas no requieren credenciales ni red.
- ✅ Se comparan baseline y candidato por feature.
- ✅ Hay métricas de calidad, latencia y coste.
- ✅ Las regresiones deterministas bloquean el gate.
- ✅ Cada métrica subjetiva tiene rúbrica y muestra humana de calibración.

## Notas técnicas

No usar una única puntuación agregada para ocultar fallos críticos. Un sistema
puede subir en utilidad y empeorar en autorización; ambos resultados deben verse
por separado.

## Archivos relevantes

- `apps/api/tests/routers/test_ai_router.py`
- `apps/api/tests/services/test_agent_service.py`
- `apps/api/tests/services/test_agent_tools.py`
- `apps/api/tests/services/test_recommendation_service.py`
- `apps/api/tests/services/test_import_service_chunking.py`
