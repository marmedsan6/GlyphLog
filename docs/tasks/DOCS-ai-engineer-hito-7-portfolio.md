# [DOCS] Hito 7 — Portfolio e entrevistas de AI Engineer

> **Estado:** backlog
> **Prioridad:** media
> **Dependencias:** [`DOCS-ai-engineer-hito-6-observability-cost.md`](DOCS-ai-engineer-hito-6-observability-cost.md)

## Contexto

El aprendizaje debe convertirse en evidencia profesional: repositorios
reproducibles, decisiones explicadas, métricas, límites y capacidad de defender
tradeoffs en una entrevista.

## Objetivo

Publicar una presentación técnica en inglés de GlyphLog y del laboratorio RAG,
con demo, resultados de evaluación, arquitectura, costes y fallos conocidos.

## Especificación

### GlyphLog README

Debe explicar:

- problema de producto y usuarios;
- flujo de chat y agente;
- tools, permisos y persistencia;
- diferencia entre context injection y RAG;
- structured outputs y manejo de errores;
- estrategia de tests y evaluación;
- observabilidad y límites de coste;
- decisiones descartadas y trabajo futuro.

### RAG README

Debe explicar:

- corpus y límites de licencia;
- ingesta, chunking, embeddings y retrieval;
- contrato de citas y abstención;
- dataset y métricas Recall@5, citation precision y faithfulness;
- ejemplos de éxito, fallo y pregunta fuera de corpus;
- cómo ejecutar localmente sin credenciales.

### Material de entrevista

Preparar cinco historias STAR:

1. fallo de agente o tool;
2. regresión detectada con evaluación;
3. reducción de coste o latencia;
4. problema de retrieval;
5. decisión de seguridad.

Preparar respuestas a:

- ¿Cuándo usarías RAG frente a una query SQL?
- ¿Cómo demostrarías que un prompt mejoró el sistema?
- ¿Cómo evitarías que un agente modifique datos incorrectos?
- ¿Qué logs guardarías con información sensible?
- ¿Qué harías antes de fine-tuning?

## Test design

| Caso | Test ejecutable previsto | Nivel |
| ---- | ------------------------ | ----- |
| TC-01 | README permite ejecutar ambos proyectos desde cero | manual |
| TC-02 | Diagramas coinciden con el flujo real | revisión |
| TC-03 | Métricas del README se regeneran desde los informes | integración |
| TC-04 | Demo cubre happy path, error y abstención | E2E/manual |
| TC-05 | No aparecen secretos, datos privados ni costes inventados | revisión |
| TC-06 | Mock interview de 30 minutos con respuestas técnicas | manual |

## Decisiones de Plan mode

- **Enfoque técnico:** publicar evidencia y límites, no solo capturas bonitas.
- **Capas afectadas:** documentación, diagramas, scripts de demo y resultados.
- **Orden:** README técnico → informes → demo → CV → entrevista.
- **Riesgos:** métricas no reproducibles, sobreafirmaciones y exposición de
  secretos; mitigación con comandos exactos, fixtures y revisión final.

## Tareas técnicas

- [ ] Escribir README de GlyphLog en inglés.
- [ ] Escribir README del laboratorio RAG en inglés.
- [ ] Crear diagrama de arquitectura y secuencia.
- [ ] Exportar informe de evaluación baseline/candidato.
- [ ] Grabar demo de 3–5 minutos por proyecto.
- [ ] Redactar tres bullets cuantificados para CV.
- [ ] Preparar cinco historias STAR y cinco preguntas técnicas.
- [ ] Hacer revisión final de secretos, licencias y reproducibilidad.

## Criterios de aceptación

- ✅ Un tercero puede entender el problema y ejecutar las demos.
- ✅ Las métricas publicadas tienen dataset, comando y fecha.
- ✅ Se muestran limitaciones y fallos conocidos.
- ✅ No hay secretos ni datos personales en el material.
- ✅ El estudiante puede defender decisiones y alternativas durante 30 minutos.
- ✅ Los repositorios distinguen claramente código de producción, laboratorio y evaluación.

## Notas técnicas

El portfolio debe priorizar calidad de ingeniería: límites, tests, costes,
seguridad y métricas son tan importantes como la respuesta generada.

## Archivos relevantes

- `README.md`
- `docs/tasks/DOCS-ai-engineer-roadmap.md`
- `labs/rag-assistant/`
- `apps/api/tests/`
- `docs/`
