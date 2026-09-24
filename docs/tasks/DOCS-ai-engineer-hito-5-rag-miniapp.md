# [DOCS] Hito 5 — Miniapp RAG evaluada

> **Estado:** backlog
> **Prioridad:** alta
> **Dependencias:** [`DOCS-ai-engineer-hito-3-evaluation.md`](DOCS-ai-engineer-hito-3-evaluation.md), [`DOCS-ai-engineer-hito-4-agents-safety.md`](DOCS-ai-engineer-hito-4-agents-safety.md)

## Contexto

GlyphLog usa context injection de la colección, pero no tiene embeddings,
recuperación vectorial ni citas. Para demostrar transferencia de conocimiento se
construirá una miniapp aislada sobre documentación propia y apuntes de AI
engineering.

## Objetivo

Construir un asistente RAG reproducible que ingeste documentos, recupere
evidencia relevante, responda con citas o se abstenga, y mida recuperación y
groundedness con un dataset versionado.

## Especificación

### Alcance y stack fijados

- Ubicación: `labs/rag-assistant` para no acoplarlo al runtime de GlyphLog.
- Backend: FastAPI y Python.
- Persistencia: PostgreSQL con pgvector.
- Embeddings: modelo local de `sentence-transformers` para no consumir el
  presupuesto de Claude.
- Generación: Claude en Bedrock mediante la API de conversación elegida para el
  experimento.
- Corpus inicial: documentación propia, apuntes y documentos del repositorio
  que se puedan redistribuir.
- No habrá autenticación multiusuario en la primera versión.

### Pipeline

1. Cargar Markdown/PDF y normalizar contenido.
2. Calcular hash de documento para ingesta idempotente.
3. Dividir en chunks con título, sección, posición y hash.
4. Generar y guardar embeddings.
5. Recuperar `top_k` por similitud y aplicar filtros de metadatos.
6. Construir prompt solo con evidencia recuperada.
7. Responder con citas o abstención explícita.
8. Guardar métricas de retrieval y generación.

### API

- `POST /api/documents`: ingesta o reemplazo idempotente.
- `DELETE /api/documents/{document_id}`: elimina documento y chunks.
- `POST /api/query`: recibe `question` y `top_k`; devuelve `answer`, `citations`,
  `used_chunks` y metadatos de ejecución.

Cada cita contiene `document_id`, título, sección, `chunk_id` y fragmento de
soporte.

### Dataset y métricas

Mínimo 30 preguntas: answerable, unanswerable, ambiguas y multi-documento.

- Recall@5 de recuperación ≥ 0,80.
- Precisión de citas ≥ 0,90.
- Abstención correcta ≥ 0,90.
- Faithfulness revisada ≥ 0,85.
- Ingesta repetida sin duplicados.
- Prompt injection dentro de documentos no cambia las políticas del sistema.

## Test design

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01 | Documento se ingesta una sola vez por hash | integración |
| TC-02 | Chunks conservan metadatos y orden | unitario |
| TC-03 | Query devuelve top-k esperado en corpus pequeño | integración |
| TC-04 | Respuesta incluye citas válidas | integración |
| TC-05 | Pregunta no soportada produce abstención | evaluación |
| TC-06 | Reingesta y borrado no dejan vectores huérfanos | integración |
| TC-07 | Dataset completo calcula Recall@5 y citation precision | evaluación |
| TC-08 | Playwright cubre consulta, loading, error y citas | E2E |

## Decisiones de Plan mode

- **Enfoque técnico:** implementar primero retrieval explícito, sin ocultar el
  pipeline detrás de una cadena de alto nivel.
- **Capas afectadas:** nuevo laboratorio, PostgreSQL/pgvector, Bedrock y harness
  de evaluación.
- **Orden:** ingesta → retrieval → generación → citas → evaluación → UI mínima.
- **Riesgos:** chunking pobre, corpus contaminado y coste; mitigación con corpus
  controlado, baseline y embeddings locales.

## Tareas técnicas

- [ ] Crear el laboratorio y su Docker Compose reproducible.
- [ ] Definir schemas de documentos, chunks, queries y citas.
- [ ] Implementar ingesta idempotente y limpieza.
- [ ] Implementar similitud vectorial y filtros de metadatos.
- [ ] Implementar prompt de respuesta con evidencia y abstención.
- [ ] Crear dataset de 30 preguntas y referencias.
- [ ] Crear UI mínima con citas visibles.
- [ ] Ejecutar evaluación y documentar fallos de retrieval.

## Criterios de aceptación

- ✅ La app arranca localmente con un único comando documentado.
- ✅ La API devuelve respuestas con citas estructuradas.
- ✅ La ingesta es idempotente y reversible.
- ✅ Las preguntas no soportadas no se responden inventando.
- ✅ Se alcanzan o documentan las métricas objetivo con baseline.
- ✅ Existe una demo reproducible y un README en inglés.

## Notas técnicas

No se debe presentar la miniapp como “RAG fiable” solo por usar un vector store.
El README debe mostrar ejemplos de fallos, preguntas no respondibles y límites
del corpus.

## Archivos relevantes

- `labs/rag-assistant/`
- `apps/api/app/core/ai_prompts.py`
- `apps/api/app/services/ai_context.py`
- `apps/api/tests/`
