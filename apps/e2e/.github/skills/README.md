# Agent Skills

Esta carpeta contiene **workflows especializados** (skills) que el agente IA puede usar para tareas específicas. Las skills se cargan bajo demanda para no malgastar contexto.

---

## Skills disponibles

| Skill | Propósito | Cuándo usarla |
|-------|---------|-------------|
| **[feature-spec](feature-spec/SKILL.md)** | Crear especificaciones estructuradas para tests E2E | Antes de implementar tests para nuevas features, flujos complejos o planificar cobertura |

---

## Cómo funcionan

### 1. Activación automática

Las skills se activan cuando la petición del usuario coincide con las frases trigger definidas en `AGENTS.md`:

```
Usuario: "Create a feature spec for the checkout flow"
        ↓
Agente: Detecta "create a feature spec" → Carga feature-spec/SKILL.md → Sigue el workflow
```

### 2. Activación manual

También puedes solicitar una skill explícitamente:
```
Usuario: "Usa la skill feature-spec para planificar los tests de login"
```

---

## Estructura de una skill

```
.github/skills/
└── [skill-name]/
    ├── SKILL.md              # Instrucciones para el agente
    ├── templates/            # Templates que usa la skill
    │   └── *.md
    └── examples/             # Ejemplos de output
        └── *.md
```

---

## Crear una nueva skill

**Cuándo:**
- Tienes un workflow repetitivo con múltiples pasos
- El workflow necesita estructura consistente entre ejecuciones
- La tarea es lo bastante especializada como para que instrucciones generales no basten

**Pasos:**
1. Crear carpeta: `.github/skills/[skill-name]/`
2. Crear `SKILL.md` con:
   - **Overview**: Qué hace la skill
   - **Trigger Phrases**: Keywords que la activan
   - **Workflow**: Proceso paso a paso
   - **Output Format**: Qué produce la skill
3. Añadir la skill a la tabla "Skills Check" de `AGENTS.md`
4. Crear templates en `templates/` si es necesario

---

## Buenas prácticas

- ✅ **Enfocada**: Una skill = un workflow
- ✅ **Repetible**: Mismos inputs producen outputs consistentes
- ✅ **Documentada**: Frases trigger claras y ejemplos
- ❌ **Demasiado amplia**: "Skill de código general"
- ❌ **Demasiado estrecha**: "Click en botón submit"

### Gestión de contexto
- Las skills se cargan **solo cuando se necesitan**
- Mantener `SKILL.md` conciso (<1000 líneas)
- Usar templates para contenido boilerplate
- Referenciar otros archivos en vez de duplicar contenido

---

## Integración con AGENTS.md

Las skills se registran en el `AGENTS.md` raíz:

```markdown
## 🎯 Skills Check (MANDATORY - Before Starting Any Task)

| Skill | Trigger Phrases | Location |
|-------|-----------------|----------|
| `feature-spec` | "create a feature spec", "spec out a feature", "write a spec" | `.github/skills/feature-spec/SKILL.md` |
```

---

*Mantenido por el equipo de GlyphLog.*
