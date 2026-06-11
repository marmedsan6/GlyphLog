# Tareas — GlyphLog

Esta carpeta gestiona el backlog y el historial de tareas del proyecto. Cada tarea documenta su contexto, objetivo, subtareas técnicas y criterios de aceptación.

## Archivos

| Archivo | Descripción |
|---|---|
| [TEMPLATE.md](./TEMPLATE.md) | Plantilla estándar para crear nuevas tareas |
| [backlog.md](./backlog.md) | Estado actual del backlog: completadas, en progreso y pendientes |

## Cómo usar el template

1. Copia `TEMPLATE.md` con el nombre `<TIPO>-<slug>.md` (p. ej. `FEAT-crear-entrada.md`).
2. Rellena todas las secciones. No dejes secciones vacías: si no aplica, escribe `N/A`.
3. Añade la tarea a `backlog.md` con su estado inicial (`backlog`).
4. Actualiza el estado en `backlog.md` al moverla a `en-progreso` o `completada`.

## Estados de tarea

| Estado | Significado |
|---|---|
| `backlog` | Definida pero no iniciada |
| `en-progreso` | Actualmente en desarrollo |
| `completada` | Todos los criterios de aceptación verificados |
