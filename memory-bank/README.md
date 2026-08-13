# Memory Bank — GlyphLog

El Memory Bank es el sistema de contexto persistente de GlyphLog. Su propósito es mantener información acumulada entre sesiones de trabajo con agentes de IA, evitando que cada sesión parta de cero.

---

## ¿Para qué sirve?

Los agentes de IA no retienen información entre sesiones. El Memory Bank resuelve esto guardando en archivos de texto plano:

- El estado actual del proyecto
- Las decisiones técnicas ya tomadas y sus razones
- Los patrones y convenciones establecidas
- Conocimiento acumulado por área técnica

---

## Estructura de archivos

```
memory-bank/
├── README.md              # Este archivo — cómo funciona el sistema
├── project-context.md     # Estado actual del proyecto (leer siempre al iniciar)
├── decisions.md           # Log de decisiones arquitectónicas (ADRs)
├── patterns.md            # Patrones y convenciones de código establecidos
├── sessions/              # Registro de sesiones de trabajo pasadas
│   └── YYYY-MM-DD.md      # Una entrada por sesión significativa
└── knowledge/             # Conocimiento técnico acumulado por área
    ├── frontend.md        # React, Vite, componentes, hooks
    ├── backend.md         # FastAPI, servicios, endpoints
    ├── database.md        # Esquema, migraciones, queries
    └── interview-qa.md    # Preguntas de entrevista y conceptos clave (Q&A)
```

### Descripción de cada archivo

| Archivo                     | Propósito                                                               | Frecuencia de lectura                              |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- |
| `project-context.md`        | Visión global: qué es el proyecto, en qué fase está, qué está pendiente | Siempre al inicio de sesión                        |
| `decisions.md`              | Por qué se eligió cada tecnología o enfoque                             | Antes de tomar decisiones de arquitectura          |
| `patterns.md`               | Cómo escribir código en este proyecto (ejemplos reales)                 | Antes de crear componentes, hooks, endpoints       |
| `knowledge/frontend.md`     | Lo aprendido sobre la capa frontend                                     | Al trabajar en `apps/web`                          |
| `knowledge/backend.md`      | Lo aprendido sobre la capa backend                                      | Al trabajar en `apps/api`                          |
| `knowledge/database.md`     | Esquema, migraciones y queries relevantes                               | Al trabajar con BD o Alembic                       |
| `knowledge/interview-qa.md` | Repaso rápido de conceptos y preguntas estrella de entrevistas          | Preparación de entrevistas / Onboarding            |
| `sessions/`                 | Historial de trabajo pasado                                             | Cuando se necesita contexto de sesiones anteriores |

---

## Instrucciones para agentes

### Al iniciar una sesión

1. Leer `project-context.md` para entender el estado actual del proyecto.
2. Leer `patterns.md` para recordar las convenciones de código establecidas.
3. Si la tarea involucra una decisión técnica relevante, leer `decisions.md` antes de proponer nada.
4. Si la tarea es específica de una capa (frontend, backend, BD), leer el archivo de `knowledge/` correspondiente.

### Durante la sesión

5. Al crear código nuevo, consultar `patterns.md` para seguir los patrones establecidos.
6. Si surge un problema técnico relevante, anotarlo mentalmente para documentarlo al final.

### Al finalizar una sesión

7. Actualizar `project-context.md` si el estado del proyecto cambió (nueva fase, nueva decisión, nuevo progreso).
8. Si se tomó una decisión arquitectónica importante, añadirla a `decisions.md` en formato ADR.
9. Si se estableció un patrón nuevo de código, añadirlo a `patterns.md`.
10. Si se acumuló conocimiento específico de frontend/backend/BD, actualizar el archivo de `knowledge/` correspondiente.
11. Crear una entrada en `sessions/YYYY-MM-DD.md` si la sesión fue significativa (nueva feature, refactor relevante, decisión importante).
12. Si una spec (en `docs/specs/`) cambió de estado o se implementó, actualizar `docs/specs/README.md` y `docs/tasks/backlog.md`.

---

## Cómo actualizar cada archivo

### `project-context.md`

Actualizar cuando:

- Cambia la fase del proyecto
- Se completa una feature importante
- Se toma una decisión que afecta el scope del MVP
- Hay cambios en el stack tecnológico

### `decisions.md`

Añadir una nueva entrada ADR cuando:

- Se elige una librería o framework nuevo
- Se decide un enfoque arquitectónico (ej: cómo estructurar la autenticación)
- Se descarta una alternativa que podría ser tentadora en el futuro
- Se toma una decisión que afecta múltiples partes del sistema

### `patterns.md`

Actualizar cuando:

- Se establece la estructura definitiva de un tipo de archivo (componente, hook, endpoint)
- Se decide un patrón de manejo de errores, loading states, etc.
- Se adopta una convención nueva que no estaba documentada

### `knowledge/*.md`

Actualizar cuando:

- Se resuelve un problema técnico no trivial
- Se descubre un bug o limitación relevante de una herramienta
- Se documenta cómo funciona algo específico del proyecto

---

## Qué NO guardar en el Memory Bank

- **Credenciales o secretos** — nunca contraseñas, tokens, connection strings con credenciales reales
- **Código completo de archivos** — el código vive en el repositorio, no en el memory bank
- **Información personal del usuario** — nombres, emails, datos de producción
- **Datos de la base de datos de producción** — queries con resultados reales, dumps
- **Decisiones temporales** — notas de "esto es un workaround" que no son decisiones reales
- **TODOs genéricos** — los backlogs van en `docs/tasks/`, no aquí

---

## Convención para sesiones

Cada archivo de sesión en `sessions/` sigue este formato:

```markdown
# Sesión YYYY-MM-DD

## Objetivo de la sesión

Qué se quería conseguir.

## Trabajo realizado

- Lista de tareas completadas

## Decisiones tomadas

- Decisiones con impacto que ya fueron registradas en decisions.md

## Problemas encontrados

- Problemas y cómo se resolvieron (o si quedaron pendientes)

## Próximos pasos

- Qué queda pendiente para la siguiente sesión
```
