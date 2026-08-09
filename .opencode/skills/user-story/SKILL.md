---
name: user-story
description: "Create INVEST-compliant user stories for new features (FEAT) in GlyphLog. Guides an iterative Q&A process to eliminate ambiguity, generates a structured story with acceptance criteria (technical + non-technical), validates against INVEST, and creates the issue directly in the GitHub Project #2 backlog via gh.sh. Use when the user wants to define a new feature, write a user story, or add something to the backlog."
---

# User Story — Creación de Historias de Usuario INVEST

Skill para crear historias de usuario de features nuevas (FEAT) en GlyphLog, con formato estándar, criterios de aceptación mixtos (técnicos y funcionales), validación INVEST y creación directa en el backlog de GitHub Projects.

## When to use

- El usuario quiere definir una nueva feature o funcionalidad
- El usuario dice "crear historia de usuario", "nueva HU", "añadir al backlog"
- El usuario describe algo que quiere que la app haga y necesita formalizarlo
- El usuario quiere una historia lista para implementar, sin ambigüedades

## 1. Flujo general

```
1. Recibir idea/feature del usuario
2. Ronda iterativa de preguntas (question tool) hasta eliminar ambigüedades
3. Generar borrador de la HU
4. Mostrar al usuario para confirmar o ajustar
5. Validar con checklist INVEST
6. Si no cumple INVEST → descomponer en HUs más pequeñas (sección 7)
7. Crear issue(s) en GitHub Projects #2 vía bash scripts/gh.sh
8. Mostrar URL(s) del/los issue(s) creado(s)
```

## 2. Fase de preguntas iterativas

### Principio fundamental

> **No generar nada hasta tener claridad total.** Ante CUALQUIER duda, preguntar.

### Cuándo preguntar

Pregunta SIEMPRE que:
- El alcance no esté claro (¿aplica a anime, manga, juegos o solo a algunos?)
- El comportamiento esperado sea ambiguo (¿qué pasa si el campo está vacío?)
- Haya múltiples interpretaciones posibles (¿"filtrar" significa buscar, ordenar, o ambos?)
- No sepas qué tipos de entrada afecta (anime/manga/game)
- No sepas qué estados aplica (watching/completed/on_hold/dropped/plan_to_watch)
- Desconozcas si hay datos obligatorios vs opcionales
- No esté claro si requiere autenticación o es público
- Haya dependencias con features existentes que no conoces
- El usuario mencione algo que pueda tener implicaciones de BD sin decirlo

### Cómo preguntar

Usa el tool `question` con opciones concretas cuando sea posible. Si la pregunta es abierta, usa texto directo.

**Ejemplo con opciones:**
```
question: "¿A qué tipos de entrada aplica esta feature?"
options:
  - "Solo anime"
  - "Solo manga"
  - "Solo videojuegos"
  - "A todos (anime, manga, videojuegos)"
  - "Anime y manga, pero no videojuegos"
```

**Ejemplo abierto:**
```
question: "¿Qué debería pasar si el usuario intenta crear una entrada duplicada (mismo título)?"
options:
  - "Permitir duplicados sin aviso"
  - "Mostrar aviso pero permitir crear"
  - "Bloquear la creación con error"
```

### Reglas de la fase de preguntas

1. **Nunca asumas.** Si no estás 100% seguro, pregunta.
2. **Máximo 3-5 preguntas por ronda.** No abrumar al usuario.
3. **Preguntas concretas con opciones.** Facilitan la respuesta.
4. **Si surgen nuevas dudas tras una respuesta, haz otra ronda.**
5. **Para cuando tengas:** qué hace, quién lo usa, qué datos involucra, qué pasa en edge cases, y qué capas toca (frontend/backend/BD).

## 3. Template de Historia de Usuario

```markdown
# [FEAT] <Título corto y descriptivo>

> **Estado:** backlog
> **Prioridad:** <alta | media | baja>
> **Dependencias:** ninguna | #[issue-number]

## Historia de usuario

**Como** <rol del usuario>,
**Quiero** <acción concreta que desea realizar>,
**Para** <beneficio o valor que obtiene>.

## Contexto

<Qué existe actualmente en la app. Qué antecede a esta feature.
Incluir estado actual de la UI, API o BD si es relevante.>

## Detalle funcional

<Descripción detallada de cómo funciona la feature.
Incluir flujos principales, flujos alternativos y edge cases.
Usar viñetas o pasos numerados para mayor claridad.>

### Flujo principal
1. <Paso 1>
2. <Paso 2>
3. <Resultado>

### Flujos alternativos
- <Caso alternativo 1>: <qué ocurre>
- <Caso alternativo 2>: <qué ocurre>

### Edge cases
- <Edge case 1>: <comportamiento esperado>
- <Edge case 2>: <comportamiento esperado>

## Criterios de aceptación

### Funcionales (visibles para el usuario)
- ✅ <Criterio funcional 1 — ej: "El usuario puede crear una entrada de anime con título y estado">
- ✅ <Criterio funcional 2>

### Técnicos (verificables por el desarrollador)
- ✅ <Criterio técnico 1 — ej: "POST /api/v1/entries devuelve 201 con el objeto creado">
- ✅ <Criterio técnico 2 — ej: "El campo title es NOT NULL en la tabla user_entries">
- ✅ <Criterio técnico 3 — ej: "El endpoint valida que entry_type sea anime|manga|game">

### Generales
- ✅ No hay regresiones en features existentes
- ✅ El código sigue las convenciones de AGENTS.md
- ✅ Lint y typecheck pasan sin errores

## Tareas técnicas

- [ ] <Subtarea 1: qué hacer en qué archivo/capa>
- [ ] <Subtarea 2>
- [ ] <Subtarea de test>

## Archivos relevantes

- `apps/web/src/...` — <qué componente/página/hook>
- `apps/api/app/...` — <qué router/service/repository/schema/model>

## Notas técnicas

<Decisiones tomadas, alternativas descartadas, referencias a docs,
consideraciones de rendimiento o seguridad.>

## Validación INVEST

- [x] **Independent:** <justificación de que no depende de otras HUs pendientes>
- [x] **Negotiable:** <justificación de que el enfoque es flexible>
- [x] **Valuable:** <justificación del valor para el usuario>
- [x] **Estimable:** <justificación de que se puede estimar el esfuerzo>
- [x] **Small:** <justificación de que es acotada y realizable en un sprint>
- [x] **Testable:** <justificación de que los criterios son verificables binariamente>
```

## 4. Creación del issue en GitHub

### Comando para crear el issue

```bash
bash scripts/gh.sh issue create \
  --title "[FEAT] <Título>" \
  --body "<Body en markdown>" \
  --label "enhancement"
```

### Añadir al proyecto #2 (Backlog)

Después de crear el issue, añadirlo al proyecto:

```bash
bash scripts/gh.sh project item add 2 \
  --url <URL-del-issue-creado> \
  --owner marmedsan6
```

### Establecer campos del proyecto

Si el proyecto tiene campos personalizados (estado, prioridad), establecerlos:

```bash
# Obtener el item ID del issue dentro del proyecto
bash scripts/gh.sh project item-list 2 --owner marmedsan6 --format json

# Establecer el estado a "Backlog" (o el que corresponda)
bash scripts/gh.sh project item edit <item-id> \
  --id <item-id> \
  --field-id <field-id-estado> \
  --project-id 2 \
  --single-select-option-id <option-id-backlog>
```

> **Nota:** Los field-id y option-id se obtienen con:
> ```bash
> bash scripts/gh.sh project field-list 2 --owner marmedsan6
> ```

### Flujo resumido de creación

1. Crear issue con `gh issue create`
2. Añadir al proyecto #2 con `gh project item add`
3. Establecer estado a "Backlog" si es posible
4. Mostrar al usuario: URL del issue + confirmación de que está en el backlog

## 5. Reglas de calidad

### Criterios de aceptación bien escritos

| Mal | Bien |
|-----|------|
| "El formulario funciona" | "El usuario puede enviar el formulario y ve un toast de confirmación" |
| "La API guarda los datos" | "POST /api/v1/entries devuelve 201 con el objeto EntryResponse completo" |
| "Se puede filtrar" | "El usuario puede filtrar entradas por estado y la lista se actualiza sin recargar" |
| "Los tests pasan" | "Los tests de EntryService cubren: crear válida, crear con tipo inválido, obtener existente" |

### Reglas

1. **Criterios binarios.** Cada criterio debe poder responderse con SÍ o NO. Nada de "funciona bien" o "es rápido".
2. **Mezclar técnicos y funcionales.** El usuario debe entender los funcionales; el desarrollador necesita los técnicos.
3. **Un criterio = una verificación.** No meter 3 cosas en un solo criterio.
4. **Edge cases explícitos.** Si hay comportamiento especial para datos vacíos, duplicados, o inválidos, documentarlo.
5. **No implementar.** La skill genera la HU, no el código. Si el usuario pide implementar, usar `senior-dev` después.

## 6. Ejemplo completo de interacción

### Usuario dice:
> "Quiero poder filtrar mis entradas por estado"

### Skill pregunta (ronda 1):
```
question: "¿A qué tipos de entrada aplica el filtro?"
options:
  - "A todos (anime, manga, videojuegos)"
  - "Solo a un tipo específico"
  - "Depende del tipo"

question: "¿Cómo quieres que sea el filtro?"
options:
  - "Un dropdown/select con los estados"
  - "Botones/tabs para cada estado"
  - "Checkboxes para seleccionar varios estados a la vez"

question: "¿Qué pasa si no hay entradas con el estado seleccionado?"
options:
  - "Mostrar mensaje vacío (ej: 'No tienes entradas en este estado')"
  - "Simplemente mostrar lista vacía"
```

### Skill pregunta (ronda 2, si surgen dudas):
```
question: "¿El filtro debe combinarse con otros filtros existentes (ej: búsqueda por título)?"
options:
  - "Sí, se pueden combinar"
  - "No, son independientes"

question: "¿El estado del filtro debe persistir en la URL para poder compartir/compartir el link?"
options:
  - "Sí, en query params"
  - "No, solo en memoria"
```

### Skill genera la HU y la muestra para confirmar

### Usuario confirma → Skill crea el issue en GitHub Projects #2

## 7. Descomposición de HUs que no cumplen INVEST

Si al validar la HU contra INVEST algún criterio no se cumple (especialmente **Small** o **Independent**), la historia **no debe crearse como un solo issue**. Debe dividirse antes.

### Cuándo dividir

| Criterio INVEST que falla | Señal | Acción |
|---|---|---|
| **Small** | La HU toca más de 2-3 capas (frontend + backend + BD + tests extensos) | Dividir por capa o por flujo |
| **Small** | Tiene más de 8-10 criterios de aceptación | Dividir en historias con 3-5 criterios cada una |
| **Small** | Las tareas técnicas son más de 8-10 | Dividir en historias con 3-5 tareas cada una |
| **Independent** | Una parte de la HU no funciona sin otra parte | Identificar la historia base y crear dependencias explícitas |
| **Testable** | Los criterios mezclan comportamientos distintos que no se pueden verificar juntos | Separar en historias con criterios homogéneos |
| **Estimable** | No se puede estimar porque hay demasiada incertidumbre | Dividir en una HU de investigación (spike) + HUs de implementación |

### Estrategias de división

**Por capa (vertical slice):**
```
HU grande: "Sistema completo de autenticación"
  → HU 1: "Backend — endpoint de registro con validación"
  → HU 2: "Backend — endpoint de login con JWT"
  → HU 3: "Frontend — formulario de registro"
  → HU 4: "Frontend — formulario de login y manejo de token"
```

**Por flujo de usuario:**
```
HU grande: "CRUD completo de entradas"
  → HU 1: "Crear una entrada (anime/manga/game)"
  → HU 2: "Listar mis entradas con paginación"
  → HU 3: "Editar una entrada existente"
  → HU 4: "Eliminar una entrada"
```

**Por tipo de entrada:**
```
HU grande: "Filtros avanzados para toda la colección"
  → HU 1: "Filtrar entradas por estado"
  → HU 2: "Filtrar entradas por tipo (anime/manga/game)"
  → HU 3: "Buscar entradas por título"
```

**Spike + implementación (cuando hay incertidumbre):**
```
HU grande: "Integrar notificaciones push"
  → HU 1 (Spike): "Investigar opciones de notificaciones push y decidir tecnología"
  → HU 2: "Implementar notificaciones push con la tecnología elegida"
```

### Flujo de descomposición

1. **Detectar el fallo INVEST** durante la validación (sección 3, checklist INVEST)
2. **Informar al usuario** de qué criterio no se cumple y por qué
3. **Proponer la división** con las sub-historias concretas (título + historia de usuario + criterios de aceptación de cada una)
4. **Preguntar al usuario** si está de acuerdo con la división usando el tool `question`
5. **Si acepta:** generar cada sub-historia como issue independiente en GitHub Projects #2, estableciendo dependencias entre ellas cuando aplique (`Dependencias: #<issue-number>`)
6. **Si no acepta:** ajustar la división según su feedback y volver a proponer

### Formato de dependencia entre HUs divididas

Cuando una HU depende de otra, indicar en el header:

```markdown
> **Dependencias:** #[issue-number-de-la-HU-base]
```

Y en la HU base, añadir una nota al final:

```markdown
## HUs derivadas
- #[issue-number] — <título de la HU derivada>
```

### Ejemplo de descomposición en acción

**Skill detecta:**
> "La HU 'Sistema de autenticación completo' no cumple Small: toca 4 capas, tiene 15 criterios de aceptación y 12 tareas técnicas."

**Skill propone:**
> "Propongo dividir en 4 historias:
> 1. [FEAT] Backend — Registro de usuario con hash de contraseña
> 2. [FEAT] Backend — Login con generación de JWT
> 3. [FEAT] Frontend — Formulario de registro con validación
> 4. [FEAT] Frontend — Formulario de login y almacenamiento de token
>
> Las HUs 3 y 4 dependen de las HUs 1 y 2 respectivamente."

**Skill pregunta:**
```
question: "¿Estás de acuerdo con esta división?"
options:
  - "Sí, crear las 4 historias"
  - "Prefiero otra división"
  - "Quiero mantenerlo como una sola HU"
```

## 8. Anti-patrones a evitar

| Anti-patrón | Por qué es malo | Qué hacer |
|---|---|---|
| Asumir alcance | Genera HUs que no reflejan lo que el usuario quiere | Preguntar siempre |
| Criterios vagos | No se pueden testear, generan disputes | Reescribir hasta que sean binarios |
| HU demasiado grande | Viola el "Small" de INVEST | Aplicar descomposición (sección 7) |
| Mezclar features | Una HU = una feature | Separar en historias independientes |
| No incluir edge cases | El desarrollador no sabe qué hacer en casos límite | Siempre documentar edge cases |
| Crear issue sin confirmar | El usuario puede querer ajustar antes | Siempre mostrar borrador primero |
