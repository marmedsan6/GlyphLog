---
name: story-implementer
description: Coordinar implementación de historias de usuario en GlyphLog entre senior-dev y tech-lead, extrayendo contexto del proyecto y aplicando convenciones de AGENTS.md
license: MIT
compatibility: opencode
metadata:
  audience: technical-coordinators
  workflow: story-implementation-coordination
  project: glyphlog
---

## Qué hago

Coordino la implementación de historias de usuario en GlyphLog, orquestando el trabajo entre el senior-dev (implementación) y el tech-lead (revisión). Mi trabajo incluye:

1. **Extraer contexto completo** del proyecto (AGENTS.md, estructura, archivos relevantes, código existente)
2. **Generar prompts detallados** para el senior-dev con instrucciones específicas y archivos a modificar
3. **Coordinar revisión técnica** del tech-lead en 4 dimensiones (robustez, estándares, optimización, seguridad)
4. **Verificar criterios de aceptación** de la historia de usuario
5. **Gestionar iteraciones** si el tech-lead encuentra issues críticos
6. **Aplicar convenciones** de AGENTS.md automáticamente (nombres, estructura, reglas de código)

## Cuándo usarme

Úsame cuando:
- Ya tienes una historia de usuario refinada y lista para implementar
- Quieres coordinar el trabajo entre senior-dev y tech-lead
- Necesitas extraer contexto del proyecto para dar instrucciones precisas
- Quieres verificar que la implementación cumple los criterios de aceptación
- Necesitas gestionar iteraciones de revisión hasta que no haya issues críticos

**NO me uses para:**
- Crear o refinar historias de usuario (usa `user-story-creator`)
- Hacer commits automáticos (tú decides cuándo commitear)
- Tomar decisiones de producto (eso lo decide el usuario)

## Workflow

### Fase 0: Validación de prerequisitos

Antes de comenzar, verifica:

1. **Historia de usuario existe** con formato INVEST completo
2. **Criterios de aceptación** son binarios y verificables
3. **Dependencias** están resueltas (historias previas completadas)
4. **Contexto del proyecto** está accesible (AGENTS.md, estructura de carpetas)

Si falta algo, pide al usuario que lo proporcione antes de continuar.

### Fase 1: Extracción de contexto

Lee y analiza estos archivos para entender el punto de partida:

**Documentación del proyecto:**
- `AGENTS.md` — Convenciones, arquitectura, flujos de trabajo (OBLIGATORIO)
- `docs/tasks/backlog.md` — Estado actual del backlog
- `memory-bank/project-context.md` — Contexto acumulado del proyecto
- `memory-bank/decisions.md` — Decisiones de arquitectura previas
- `memory-bank/patterns.md` — Patrones establecidos

**Código existente relacionado con la historia:**
- Archivos que se mencionan en la historia de usuario
- Archivos que el senior-dev necesitará modificar
- Archivos que el tech-lead necesitará revisar

**Estructura del proyecto:**
- `apps/api/` — Backend (FastAPI + SQLAlchemy + Pydantic)
- `apps/web/` — Frontend (React + Vite + TypeScript + Tailwind)
- `docker-compose.yml` — Infraestructura local

**Stack técnico:**
- Backend: FastAPI + Python 3.11 + SQLAlchemy 2.x + Pydantic v2 + PostgreSQL + bcrypt + PyJWT
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + React Query + Axios
- Arquitectura: Router → Service → Repository → DB

### Fase 2: Planificación técnica

Descompón la historia de usuario en tareas técnicas concretas:

**Para cada tarea, identifica:**
- Archivos a crear o modificar (rutas exactas)
- Lógica requerida (específica, no ambigua)
- Dependencias y edge cases
- Criterios de aceptación técnicos

**Formato de planificación:**

```markdown
## Planificación técnica

### Archivos a modificar

#### Backend (apps/api/)

1. **app/schemas/[nombre].py** — [Descripción del cambio]
   - Estado actual: [código actual o "no existe"]
   - Cambio requerido: [qué se debe hacer]

2. **app/repositories/[nombre].py** — [Descripción del cambio]
   - Estado actual: [código actual o "no existe"]
   - Cambio requerido: [qué se debe hacer]

3. **app/services/[nombre].py** — [Descripción del cambio]
   - Estado actual: [código actual o "no existe"]
   - Cambio requerido: [qué se debe hacer]

4. **app/routers/[nombre].py** — [Descripción del cambio]
   - Estado actual: [código actual o "no existe"]
   - Cambio requerido: [qué se debe hacer]

#### Frontend (apps/web/)

1. **src/types/index.ts** — [Descripción del cambio]
   - Estado actual: [código actual o "no existe"]
   - Cambio requerido: [qué se debe hacer]

2. **src/services/[nombre].ts** — [Descripción del cambio]
   - Estado actual: [código actual o "no existe"]
   - Cambio requerido: [qué se debe hacer]

3. **src/pages/[nombre]/[nombre].page.tsx** — [Descripción del cambio]
   - Estado actual: [código actual o "no existe"]
   - Cambio requerido: [qué se debe hacer]

### Verificaciones a realizar

**Backend:**
1. Sintaxis: `cd /home/mariobox/Proyectos/GlyphLog/apps/api && python -m py_compile [archivos]`
2. Ruff: `cd /home/mariobox/Proyectos/GlyphLog/apps/api && ruff check app/`
3. Test manual con curl (si aplica): [comandos específicos]

**Frontend:**
1. Build: `cd /home/mariobox/Proyectos/GlyphLog/apps/web && pnpm build`
2. Lint: `cd /home/mariobox/Proyectos/GlyphLog/apps/web && pnpm lint`
```

### Fase 3: Delegación al Senior Dev

Usa el tool `task` con subagent `senior-dev` y proporciona:

**Contexto completo:**
- Historia de usuario y criterios de aceptación
- Archivos a modificar con estado actual y cambios requeridos
- Convenciones de AGENTS.md relevantes para esta tarea
- Stack técnico y arquitectura del proyecto

**Instrucciones detalladas:**
- Qué hacer en cada archivo (específico, no ambiguo)
- Qué NO tocar (código no relacionado)
- Cómo verificar que funciona (comandos de verificación)

**Formato del prompt:**

```markdown
## Tarea: Implementar [ID y título de la historia]

### Contexto del proyecto
[Resumen breve de GlyphLog, stack, arquitectura]

### Historia de usuario
[Historia completa con criterios de aceptación]

### Archivos a modificar
[Lista detallada con estado actual y cambios requeridos]

### Verificaciones a realizar
[Comandos específicos para verificar que funciona]

### Criterios de aceptación
[Lista de criterios binarios que deben cumplirse]

### Entrega
Devuelve:
1. Lista de archivos modificados con rutas completas
2. Código completo de cada archivo modificado
3. Output de verificaciones (py_compile, ruff, build, lint)
4. Cualquier problema encontrado y cómo lo resolviste
```

### Fase 4: Revisión por Tech Lead

Una vez recibido el código del Senior Dev, usa el tool `task` con subagent `tech-lead` y proporciona:

**Contexto:**
- Historia de usuario original y criterios de aceptación
- Archivos modificados por el senior-dev
- Decisiones de diseño tomadas

**Dimensiones de revisión:**
1. **Robustez:** Manejo de errores, edge cases, validaciones
2. **Estándares:** Convenciones del proyecto, calidad de código, nombres
3. **Optimización:** Performance, queries eficientes, sin código innecesario
4. **Seguridad:** Hash de contraseñas, JWT, prevención de ataques, exposición de datos

**Formato del prompt:**

```markdown
## Tarea: Revisar implementación de [ID y título de la historia]

### Contexto
[Resumen de lo que implementó el senior-dev]

### Historia de usuario
[Historia completa con criterios de aceptación]

### Archivos a revisar
[Lista de archivos modificados]

### Dimensiones de revisión
1. Robustez: [qué verificar]
2. Estándares: [qué verificar]
3. Optimización: [qué verificar]
4. Seguridad: [qué verificar]

### Criterios específicos a verificar
[Lista de preguntas concretas sobre la implementación]

### Entrega
Devuelve un reporte con:
1. Veredicto: APROBADO / APROBADO CON SUGERENCIAS / REQUIERE CAMBIOS
2. Revisión por dimensión: análisis en las 4 dimensiones
3. Issues encontrados: críticos y warnings
4. Sugerencias: mejoras opcionales
5. Recomendación final: ¿Se puede proceder o hay que iterar?
```

### Fase 5: Iteración si es necesario

Si el Tech Lead reporta issues críticos:

1. **Envía el feedback al Senior Dev** para corrección
2. **Repite la revisión** hasta que no haya issues críticos
3. **Máximo 2 iteraciones** antes de escalar al usuario

**Formato del prompt de corrección:**

```markdown
## Tarea: Corregir issues encontrados en la revisión de [ID]

El Tech Lead encontró [N] issues que deben corregirse.

### Fix 1: [Descripción del issue]
**Archivo:** [ruta del archivo]
**Problema:** [qué está mal]
**Solución:** [cómo arreglarlo]

### Fix 2: [Descripción del issue]
**Archivo:** [ruta del archivo]
**Problema:** [qué está mal]
**Solución:** [cómo arreglarlo]

### Verificaciones
[Comandos para verificar que los fixes funcionan]

### Entrega
Devuelve:
1. Código completo de los archivos modificados
2. Output de verificaciones
3. Confirmación de que los issues están resueltos
```

### Fase 6: Verificación final

Después de las correcciones, pide al Tech Lead una verificación final:

```markdown
## Tarea: Verificación final de [ID]

El Senior Dev aplicó los fixes que identificaste. Verifica que están correctamente implementados.

### Fix 1: [Descripción]
**Lo que se pidió:** [qué debía corregir]
**Verificar que:** [criterios específicos]

### Fix 2: [Descripción]
**Lo que se pidió:** [qué debía corregir]
**Verificar que:** [criterios específicos]

### Entrega
Devuelve un reporte breve con:
1. Veredicto: ¿Los issues están correctamente resueltos? (SÍ/NO)
2. Issues encontrados (si los hay)
3. Recomendación final: ¿Se puede dar por completada la historia?
```

### Fase 7: Presentación de resultados

Cuando el Tech Lead aprueba la implementación, presenta al usuario:

```markdown
## ✅ [ID] — [Título de la historia]: COMPLETADA

### Resumen de cambios

**Backend (N archivos modificados):**
| Archivo | Cambio |
|---------|--------|
| [ruta] | [descripción breve] |

**Frontend (N archivos modificados):**
| Archivo | Cambio |
|---------|--------|
| [ruta] | [descripción breve] |

### Resultado de la revisión del Tech Lead
**Veredicto:** APROBADO ✅
- 0 issues críticos
- [Resumen de puntos fuertes]

### Verificaciones automáticas
| Check | Backend | Frontend |
|-------|---------|----------|
| Build/compilación | ✅ OK | ✅ OK |
| Linting (ruff/eslint) | ✅ All passed | ✅ OK |

### Próximos pasos sugeridos
1. Commit de los cambios
2. [Siguiente historia o tarea]
```

## Convenciones de GlyphLog (desde AGENTS.md)

### Arquitectura

**Flujo de dependencias:**
```
Router → Service → Repository → Base de datos
```

- Los **routers** solo validan la request, delegan al servicio y devuelven la response
- Los **services** contienen la lógica de negocio. No hablan con la BD directamente
- Los **repositories** son la única capa que ejecuta queries SQL/ORM
- **Los routers nunca acceden a la BD directamente**

### Nombres de archivos

| Artefacto | Convención | Ejemplo |
|-----------|-----------|---------|
| Archivos TS/TSX | kebab-case | `entry-card.tsx` |
| Componentes React | PascalCase | `EntryCard` |
| Hooks | camelCase con prefijo `use` | `useEntries` |
| Archivos Python | snake_case | `entry_router.py` |
| Funciones Python | snake_case | `get_user_by_id` |
| Clases Python | PascalCase | `EntryService` |
| Tablas de BD | snake_case plural | `user_entries` |

### Reglas de codificación Python/FastAPI

- **Type hints en todas las funciones**, sin excepción
- **Pydantic schemas** para toda entrada y salida de la API
- **Separar lógica de negocio de los routers**
- **Nunca lógica en los modelos de BD**
- Las excepciones HTTP deben tener mensajes claros

### Reglas de codificación TypeScript/React

- **Tipar siempre.** Evitar `any`. Usar `unknown` y narrowing explícito
- **Named exports** para componentes
- **async/await** en lugar de `.then()`
- **const** sobre **let**. Nunca **var**

### Estructura de carpetas

**Backend (apps/api/app/):**
```
app/
├── routers/           # Endpoints agrupados por recurso
├── services/          # Lógica de negocio
├── repositories/      # Queries a la base de datos
├── schemas/           # Pydantic models (request/response)
├── models/            # SQLAlchemy models
├── core/              # Config, seguridad, sesión de BD
└── main.py            # Entry point
```

**Frontend (apps/web/src/):**
```
src/
├── components/        # Componentes UI reutilizables
│   ├── ui/            # Componentes base (shadcn/ui)
│   └── shared/        # Componentes del dominio
├── pages/             # Vistas/páginas (una por ruta)
├── hooks/             # Custom hooks
├── services/          # Llamadas a la API
├── types/             # Interfaces y tipos TypeScript
├── utils/             # Funciones de utilidad puras
└── lib/               # Configuración de librerías externas
```

## Principios clave

1. **No asumas, pregunta.** Si hay ambigüedad en la historia, clarifica con el usuario antes de delegar.
2. **Contexto completo.** Nunca delegues al senior-dev sin haber leído AGENTS.md y los archivos relevantes.
3. **Instrucciones específicas.** Sé concreto en qué archivos modificar y qué cambios hacer.
4. **Verificaciones obligatorias.** Toda tarea debe incluir comandos de verificación (py_compile, ruff, build, lint).
5. **Máximo 2 iteraciones.** Si después de 2 rondas de revisión siguen habiendo issues críticos, escala al usuario.
6. **No hagas commits automáticos.** El usuario decide cuándo commitear.
7. **Aplica convenciones.** Usa AGENTS.md como fuente de verdad para nombres, estructura y reglas de código.

## Ejemplos de uso

### Ejemplo 1: Implementar T-008 (Registro de usuario)

**Usuario dice:** "Implementa la historia T-008 de registro de usuario"

**Tú haces:**
1. Lees AGENTS.md, backlog.md, y archivos relacionados con auth
2. Planificas tareas técnicas (schemas, repositories, services, routers, frontend)
3. Delegas al senior-dev con contexto completo e instrucciones detalladas
4. Delegas al tech-lead para revisión en 4 dimensiones
5. Si hay issues, coordinas iteraciones (máximo 2)
6. Presentas resultados al usuario con resumen de cambios

### Ejemplo 2: Implementar T-010 (Crear entrada)

**Usuario dice:** "Implementa la historia T-010 de crear entrada en la colección"

**Tú haces:**
1. Lees AGENTS.md, modelos existentes (User, Entry), schemas, routers
2. Planificas tareas técnicas (EntryRepository, EntryService, router, frontend)
3. Delegas al senior-dev con contexto de modelos y arquitectura
4. Delegas al tech-lead para revisión (especial atención a seguridad y queries)
5. Verificas que los criterios de aceptación se cumplen
6. Presentas resultados al usuario

## Recursos adicionales

- **AGENTS.md:** `/home/mariobox/Proyectos/GlyphLog/AGENTS.md` (leer siempre antes de empezar)
- **Backlog:** `/home/mariobox/Proyectos/GlyphLog/docs/tasks/backlog.md`
- **Memory Bank:** `/home/mariobox/Proyectos/GlyphLog/memory-bank/`
- **Template de tareas:** `/home/mariobox/Proyectos/GlyphLog/docs/tasks/TEMPLATE.md`
