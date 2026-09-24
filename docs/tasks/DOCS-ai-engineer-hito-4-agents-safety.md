# [DOCS] Hito 4 — Agentes fiables y seguros

> **Estado:** backlog
> **Prioridad:** alta
> **Dependencias:** [`DOCS-ai-engineer-hito-3-evaluation.md`](DOCS-ai-engineer-hito-3-evaluation.md)

## Contexto

GlyphLog tiene un agente ReAct con tres tools: buscar, crear y actualizar
entradas. El agente recibe `user_id` mediante `RunnableConfig`, puede producir
eventos `tool` y tiene capacidad de mutar datos.

Existe un riesgo didáctico concreto: `update_entry` necesita un `entry_id`, pero
la salida actual de `search_collection` no expone identificadores. Además, los
resultados de tools y las instrucciones del usuario deben tratarse como datos no
confiables.

## Objetivo

Diseñar y probar un agente cuyas tools sean autorizables, idempotentes,
observables y seguras ante errores, repetición y prompt injection.

## Especificación

### Contratos

- Cada tool tiene nombre, descripción, schema de argumentos, permisos y formato
  de resultado explícitos.
- `search_collection` debe devolver información suficiente para seleccionar una
  entrada sin filtrar datos de otro usuario.
- Crear, actualizar y eliminar requieren confirmación cuando la intención sea
  ambigua o la operación sea irreversible.
- Las tools nunca reciben un `user_id` elegido por el modelo; se obtiene del
  contexto autenticado.
- Retries no pueden ejecutar dos veces una misma mutación.
- Un resultado parcial del agente se conserva sin convertirlo automáticamente en
  éxito completo.

### Casos adversariales

- Usuario A intenta consultar o actualizar una entrada de B.
- UUID inválido, entry inexistente y argumentos incompatibles.
- Tool repetida por timeout.
- Tool result contiene instrucciones maliciosas.
- Documento o nota del usuario contiene “ignora las instrucciones anteriores”.
- El modelo intenta mutar sin confirmar.
- El agente supera límite de pasos o tiempo.

## Test design

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01 | Tool recibe siempre el usuario autenticado | unitario |
| TC-02 | Consulta cruzada no devuelve datos | integración |
| TC-03 | Mutación sin confirmación se rechaza o solicita confirmación | integración |
| TC-04 | Retry con la misma idempotency key no duplica | integración |
| TC-05 | Tool result con prompt injection no altera política | unitario |
| TC-06 | Stream emite `tool`, `delta` y `done` correctamente | unitario |
| TC-07 | Límite de pasos detiene el agente | integración |
| TC-08 | Dataset de tool selection alcanza el umbral definido | evaluación |

## Decisiones de Plan mode

- **Enfoque técnico:** reforzar los contratos antes de añadir más autonomía o
  más agentes.
- **Capas afectadas:** tools, `AgentService`, auth, `EntryService`, schemas y tests.
- **Orden:** caracterización → autorización → confirmaciones → idempotencia → ataques.
- **Riesgos:** bloquear demasiadas acciones legítimas o confiar en Guardrails como
  única defensa; mitigación con permisos de aplicación y casos revisados.

## Tareas técnicas

- [ ] Documentar el contrato de cada tool.
- [ ] Resolver el acceso al `entry_id` sin exponer datos indebidos.
- [ ] Introducir confirmación para mutaciones ambiguas.
- [ ] Definir estrategia de idempotencia y retries.
- [ ] Añadir límites de pasos, tiempo y tamaño de resultado.
- [ ] Crear la suite adversarial y medir tool-selection accuracy.
- [ ] Registrar tool calls y errores sin guardar secretos.

## Criterios de aceptación

- ✅ 100 % de los casos de aislamiento de usuario pasan.
- ✅ Ninguna mutación sensible ocurre sin autorización y confirmación necesarias.
- ✅ Los retries no generan duplicados.
- ✅ Hay al menos 20 casos adversariales automatizados.
- ✅ Tool-selection accuracy mínima del 90 % en el dataset.
- ✅ Los fallos del agente son explicables mediante eventos y logs.

## Notas técnicas

La seguridad de una tool no puede delegarse por completo al prompt ni al modelo.
Las validaciones de permisos, schema, ownership y confirmación deben estar en la
aplicación y cubrir también los resultados que el modelo recibe.

## Archivos relevantes

- `apps/api/app/ai/tools.py`
- `apps/api/app/services/agent_service.py`
- `apps/api/app/routers/ai.py`
- `apps/api/app/services/entry_service.py`
- `apps/api/tests/services/test_agent_tools.py`
- `apps/api/tests/services/test_agent_service.py`
