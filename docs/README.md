# Documentación Técnica — GlyphLog

Esta carpeta contiene toda la documentación técnica del proyecto GlyphLog: decisiones de arquitectura, tareas de desarrollo y configuración de herramientas externas.

## Contenido

| Sección         | Descripción                                                                                          | Enlace                          |
| --------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------- |
| `architecture/` | Visión general, frontend, backend, base de datos y estrategia de despliegue                          | [Ver](./architecture/README.md) |
| `specs/`        | Especificaciones técnicas formales (contratos API, schemas, data models, edge cases) previas al plan | [Ver](./specs/README.md)        |
| `tasks/`        | Backlog del proyecto, plantilla de tareas y estado de cada ítem                                      | [Ver](./tasks/README.md)        |
| `features/`     | Documentación de features complejas (recomendaciones, etc.)                                          | [Ver](./features/)              |
| `mcps/`         | Configuración e instrucciones de Model Context Protocols usados en el proyecto                       | [Ver](./mcps/)                  |

> Los apuntes de estudio para entrevistas viven en `memory-bank/knowledge/interview-qa.md`.

## Cómo mantener esta documentación actualizada

- **Al tomar una decisión arquitectónica**: documenta el cambio en el archivo correspondiente de `architecture/` antes de implementarlo.
- **Al iniciar una feature (Tier 2/3)**: escribe la spec en `specs/` (o la sección `## Especificación` del task doc) y apruébala antes de implementar.
- **Al iniciar una tarea**: crea el archivo en `tasks/` usando `TEMPLATE.md` y actualiza el estado en `backlog.md`; enlaza la spec aprobada en la sección `## Especificación`.
- **Al completar una tarea**: marca el estado como `completada` en `backlog.md`, pasa la spec a `implementada` en `specs/` y actualiza cualquier doc de arquitectura afectado.
- **Regla general**: el código y la documentación deben moverse juntos en el mismo commit cuando el cambio afecta ambos.
