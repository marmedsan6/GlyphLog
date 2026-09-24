# [DOCS] Hito 0 — Mapa de AI engineering en GlyphLog

> **Estado:** en-progreso
> **Prioridad:** alta
> **Dependencias:** ninguna

## Contexto

GlyphLog ya contiene varias superficies de aprendizaje para AI engineering:

- Chat autenticado con streaming SSE y persistencia de conversaciones.
- Agente ReAct construido sobre LangGraph con tools que consultan y modifican la colección.
- Recomendaciones e importaciones con salidas JSON generadas por un LLM.
- Contexto personalizado de la colección inyectado en el system prompt.
- Tests unitarios e integración alrededor de los servicios de IA.

El chat principal entra por `apps/api/app/routers/ai.py`, delega en
`AgentService`, construye un agente con `ChatBedrock` y usa las tools de
`apps/api/app/ai/tools.py`. El repositorio también conserva `AIService`, una
abstracción multi-proveedor de streaming que debe estudiarse como diseño
alternativo, no asumirse como el camino activo del chat.

El contexto actual de colección está limitado por tamaño y se introduce como
texto en el prompt. Eso permite estudiar la diferencia entre context injection
y RAG con recuperación vectorial, que será un hito posterior.

## Objetivo

Que el estudiante pueda explicar y trazar una interacción de GlyphAI desde el
frontend hasta PostgreSQL, identificando en cada paso el contrato, el riesgo y
la evidencia de test correspondiente.

## Especificación

N/A. Es una tarea educativa y documental de Tier 1; no cambia el comportamiento
de producción.

## Test design

N/A. La validación de este hito consiste en ejercicios reproducibles y una
explicación técnica revisable.

### Matriz de automatización

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01 | `apps/api/tests/routers/test_ai_router.py` — leer los casos de chat SSE y persistencia | integración |
| TC-02 | `apps/api/tests/services/test_agent_service.py` — leer los eventos `delta`, `tool` y `done` | unitario |
| TC-03 | `apps/api/tests/services/test_agent_tools.py` — leer autorización y contratos de tools | unitario |

## Decisiones de Plan mode

- **Enfoque técnico:** primero comprensión y trazabilidad; después cambios pequeños respaldados por tests y datasets de evaluación.
- **Capas afectadas:** documentación educativa y, en hitos posteriores, servicios de IA, tools, evaluación y observabilidad.
- **Dependencias y orden:** arquitectura → fundamentos LLM/Bedrock → structured outputs → evaluación → agentes seguros → RAG.
- **Riesgos y mitigaciones:** no confundir un test mockeado con calidad del modelo; separar siempre tests deterministas, evaluaciones pagadas y revisión humana.
- **Archivos previstos:** este documento; en hitos posteriores se añadirán datasets y harnesses separados de la lógica de producción.

## Ejercicios del Hito 0

### Ejercicio 1 — Diagrama de secuencia

Crear un diagrama en inglés que incluya:

1. `useAIChat`/`streamChat`.
2. `POST /api/v1/ai/chat`.
3. resolución o creación de conversación.
4. construcción del system prompt.
5. `AgentService.astream`.
6. decisión del agente y llamada a una tool.
7. `EntryService` y repository.
8. eventos SSE `conversation_id`, `delta`, `tool` y `[DONE]`.
9. persistencia del mensaje parcial o completo cuando el stream termina con error.

### Ejercicio 2 — Glosario mínimo

Definir con un ejemplo de GlyphLog:

- modelo, prompt, mensaje y contexto;
- token, ventana de contexto y truncado;
- streaming y time-to-first-token;
- agente, workflow, tool y resultado de tool;
- memoria de conversación frente a retrieval;
- structured output, schema y validación;
- error de proveedor frente a error de negocio.

### Ejercicio 3 — Contratos y riesgos

Responder por escrito:

- ¿Qué garantiza que una conversación pertenece al usuario autenticado?
- ¿Qué ocurre si el stream falla después de emitir varios deltas?
- ¿Qué información necesita `update_entry` para funcionar correctamente?
- ¿Qué datos de la colección se introducen en el prompt y con qué prioridad?
- ¿Qué comportamiento está cubierto por mocks y qué comportamiento todavía no se mide?

### Ejercicio 4 — Baseline reproducible

Ejecutar la suite relevante sin modificar código y anotar:

- resultado de los tests de router, agente, tools, importación y recomendaciones;
- duración total;
- qué casos son deterministas;
- qué partes requieren un proveedor real;
- cualquier fallo de entorno separado de un fallo del proyecto.

#### Resultado inicial — 24 de septiembre de 2026

- `docker compose ps`: API, PostgreSQL y web están `Up`; PostgreSQL se publica
  localmente en `5433`.
- Ejecución sin override: 60 errores de fixture por intentar conectar a
  `localhost:5432`. Se clasifica como configuración del entorno, no como fallo
  de lógica.
- Ejecución reproducible con el puerto publicado por Compose:

  ```text
  DATABASE_URL=postgresql+asyncpg://...@localhost:5433/glyphlog \
    ./.venv/bin/pytest -q \
    tests/routers/test_ai_router.py \
    tests/services/test_agent_service.py \
    tests/services/test_agent_tools.py \
    tests/services/test_ai_service.py \
    tests/services/test_import_service_chunking.py \
    tests/services/test_recommendation_service.py

  60 passed, 6 warnings in 8.19s
  ```

- Las advertencias son deprecaciones de Pydantic/Starlette; no bloquearon la
  suite y quedan fuera del alcance del Hito 0.

## Tareas técnicas

- [x] Confirmar que el índice de codebase-memory está listo.
- [x] Identificar el flujo activo de chat y sus puntos de entrada.
- [x] Localizar los tests específicos de IA.
- [ ] Completar el diagrama de secuencia en inglés.
- [ ] Completar el glosario y las respuestas de contratos/riesgos.
- [x] Ejecutar y registrar el baseline de tests relevante.
- [ ] Completar los ejercicios y revisar si el estudiante puede pasar al Hito 1.

## Criterios de aceptación

- ✅ El flujo de chat puede explicarse de frontend a base de datos.
- ✅ Se distingue el agente activo de la abstracción multi-proveedor alternativa.
- ✅ Se distingue context injection de RAG vectorial.
- ✅ Se conocen los eventos SSE y el comportamiento ante error parcial.
- ✅ Se identifican los contratos de las tres tools y sus límites actuales.
- ✅ Existe evidencia de la suite de tests relevante.
- ✅ No se modifica código de producción para completar este hito.

## Notas técnicas

La evaluación posterior debe empezar por evaluadores deterministas: schema,
autorización, selección de tool, argumentos y reglas de negocio. La calidad
subjetiva del texto se incorporará más adelante con referencias humanas y un
LLM-as-judge calibrado.

## Archivos relevantes

- `apps/api/app/routers/ai.py`
- `apps/api/app/services/agent_service.py`
- `apps/api/app/ai/tools.py`
- `apps/api/tests/routers/test_ai_router.py`
- `apps/api/tests/services/test_agent_service.py`
- `apps/api/tests/services/test_agent_tools.py`
