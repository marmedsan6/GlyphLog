# [DOCS] Hito 1 — Fundamentos LLM y Amazon Bedrock

> **Estado:** backlog
> **Prioridad:** alta
> **Dependencias:** [`DOCS-ai-engineer-hito-0.md`](DOCS-ai-engineer-hito-0.md)

## Contexto

GlyphLog tiene dos caminos relacionados con modelos: el chat agente usa
`ChatBedrock` a través de LangChain/LangGraph, mientras que otras features usan
clientes de completions y un cliente Bedrock para JSON. Antes de mejorar la
calidad hay que entender qué ocurre en la frontera modelo-aplicación.

## Objetivo

Explicar, ejecutar y probar una invocación de Claude en Bedrock con streaming,
control de contexto, manejo de errores y telemetría mínima, sin depender de
llamadas reales en la suite normal.

## Especificación

N/A. Es una tarea educativa de Tier 1; las futuras interfaces de código se
definirán al implementar cada slice.

### Temario obligatorio

- Roles `system`, `user` y `assistant`; mensajes frente a prompts.
- Tokens, ventana de contexto, truncado e historial reciente.
- Temperatura, límites de salida y variabilidad.
- Streaming, time-to-first-token y duración total.
- Async/await, timeouts, retries y throttling.
- Diferencia entre SDK directo, LangChain y la interfaz del dominio.
- Presupuesto por ejecución y separación entre tests y evaluaciones pagadas.

### Práctica

- Trazar otra vez el camino `useAIChat → /api/v1/ai/chat → AgentService`.
- Crear un cliente experimental aislado que invoque Claude en Bedrock y emita
  deltas; no debe introducirse todavía en la aplicación de producción.
- Comparar una invocación con historial completo frente a historial truncado.
- Registrar modelo, proveedor, inicio, primer token, final, tokens disponibles
  y categoría de error.
- Escribir respuestas mockeadas para éxito, timeout, throttling, stream parcial
  y error no recuperable.

## Test design

### Matriz de automatización

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01 | Stream mock devuelve todos los deltas en orden | unitario |
| TC-02 | Historial supera el límite y se trunca de forma determinista | unitario |
| TC-03 | Error de conexión se transforma en error de proveedor | unitario |
| TC-04 | Stream interrumpido conserva el texto parcial | integración |
| TC-05 | Cliente real de Bedrock con dataset sintético pequeño | manual/pagado |

## Decisiones de Plan mode

- **Enfoque técnico:** conservar los adaptadores actuales y crear el experimento
  fuera del camino de producción hasta tener tests y métricas.
- **Capas afectadas:** `AIService`, `AgentService`, dependencias de modelo y
  tests del API.
- **Orden:** teoría → mocks → experimento real limitado → documentación.
- **Riesgos:** coste, secretos, diferencias entre providers y falsos positivos
  por mocks; mitigación mediante límites, datasets sintéticos y logs sanitizados.

## Tareas técnicas

- [ ] Leer `AIService.create_stream`, `AgentService.astream` y `get_chat_model`.
- [ ] Documentar el contrato de mensajes de entrada y eventos de salida.
- [ ] Implementar el cliente experimental o notebook reproducible con límite de llamadas.
- [ ] Añadir tests de streaming, truncado y errores usando mocks.
- [ ] Ejecutar una muestra pagada y anotar coste, TTFT, latencia y tokens.
- [ ] Escribir una comparación entre `ChatBedrock`, cliente directo y `AIService`.

## Criterios de aceptación

- ✅ Se puede explicar cada campo enviado al modelo y cada evento recibido.
- ✅ El experimento funciona con mocks sin credenciales.
- ✅ Los errores recuperables y no recuperables tienen tratamiento distinto.
- ✅ Hay una medición real pequeña de coste y latencia.
- ✅ Ninguna clave o prompt sensible aparece en el repositorio.
- ✅ El estudiante puede explicar por qué una respuesta mockeada no demuestra calidad del modelo.

## Notas técnicas

Usar el modelo Bedrock configurado por el proyecto para la muestra real y un
modelo económico para iteraciones. No cambiar todavía el proveedor principal
del chat ni introducir prompt caching antes de medir repetición y tamaño de
prefijos.

## Archivos relevantes

- `apps/api/app/services/ai_service.py`
- `apps/api/app/services/agent_service.py`
- `apps/api/app/core/dependencies.py`
- `apps/api/app/integrations/bedrock/client.py`
- `apps/api/tests/services/test_ai_service.py`
