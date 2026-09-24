# [DOCS] Hito 6 — Observabilidad, coste y operación

> **Estado:** backlog
> **Prioridad:** alta
> **Dependencias:** [`DOCS-ai-engineer-hito-4-agents-safety.md`](DOCS-ai-engineer-hito-4-agents-safety.md), [`DOCS-ai-engineer-hito-5-rag-miniapp.md`](DOCS-ai-engineer-hito-5-rag-miniapp.md)

## Contexto

Un sistema LLM en producción necesita explicar no solo si respondió, sino qué
modelo usó, cuánto tardó, qué tools llamó, qué contexto recuperó y cuánto costó.
GlyphLog todavía no tiene una señal unificada de calidad, coste y latencia.

## Objetivo

Crear una capa mínima de telemetría y control de costes que permita investigar
una respuesta defectuosa sin almacenar datos sensibles ni ejecutar llamadas
pagadas accidentalmente.

## Especificación

### Evento de ejecución

Cada invocación real o mockeada debe poder asociarse a:

- `trace_id`, `request_id`, feature y versión de prompt.
- proveedor y modelo.
- timestamps de inicio, primer token y final.
- tokens de entrada/salida/cache si están disponibles.
- tools llamadas y duración por tool.
- chunks recuperados en RAG.
- resultado, error clasificado y evaluación.
- estimación de coste.

### Privacidad y retención

- No guardar prompts completos por defecto.
- Sanitizar emails, tokens, cookies y datos de usuario.
- Usar datasets sintéticos para logging de invocaciones completas.
- Documentar retención, acceso y borrado.

### Presupuesto

- Alertas al 25 %, 50 %, 75 % y 90 % de 100 USD.
- Parar experimentos pagados al alcanzar 90 USD.
- Reservar 10 USD para contingencia.
- CI siempre mockeado.

## Test design

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01 | Evento de telemetría tiene schema válido | unitario |
| TC-02 | Trace conserva relación entre router, agente, tool y modelo | integración |
| TC-03 | Datos sensibles se eliminan o enmascaran | unitario |
| TC-04 | Coste se calcula con fixture de tokens | unitario |
| TC-05 | Presupuesto bloquea nueva ejecución al umbral | integración |
| TC-06 | Dashboard/informe muestra latencia, errores y calidad | manual |
| TC-07 | Logs de streaming no rompen orden ni backpressure | integración |

## Decisiones de Plan mode

- **Enfoque técnico:** empezar con eventos JSON locales y después exportar las
  métricas necesarias a CloudWatch; no acoplar la lógica a un SaaS.
- **Capas afectadas:** routers, servicios LLM, agente, RAG lab, logging y CI.
- **Orden:** schema → sanitización → métricas → coste → dashboard → alertas.
- **Riesgos:** filtrar secretos, duplicar costes o tener métricas sin contexto;
  mitigación con redaction tests y trace IDs obligatorios.

## Tareas técnicas

- [ ] Definir schema de evento y categorías de error.
- [ ] Añadir instrumentación a chat, recommendation, import y RAG.
- [ ] Crear redaction tests con datos sintéticos.
- [ ] Implementar ledger de tokens y coste.
- [ ] Configurar alertas de presupuesto sin secretos en el repositorio.
- [ ] Crear informe o dashboard de calidad, coste y latencia.
- [ ] Documentar qué se puede activar en CloudWatch y qué no se debe registrar.

## Criterios de aceptación

- ✅ Toda invocación real tiene trace y métricas mínimas.
- ✅ Los logs no contienen secretos ni datos personales sin sanitizar.
- ✅ El coste acumulado es visible y tiene límite operativo.
- ✅ CI no consume crédito.
- ✅ Se puede investigar una respuesta desde su trace hasta sus tools y contexto.
- ✅ Existe evidencia de una alerta o simulación de umbral.

## Notas técnicas

Model invocation logging de Bedrock puede conservar inputs y outputs completos;
solo debe probarse con datos sintéticos y con una política de retención explícita.

## Archivos relevantes

- `apps/api/app/routers/ai.py`
- `apps/api/app/services/ai_service.py`
- `apps/api/app/services/agent_service.py`
- `apps/api/app/integrations/bedrock/client.py`
- `labs/rag-assistant/`
