---
name: fix-issue
description: "Use when verifying bugs, creating INVEST-formatted issue/user stories for bugs, or applying bug report best practices. Covers severity classification (P0-P3), INVEST templates for bugs, GitHub issue body templates, verification checklists, and closure reports. Specific to GlyphLog."
---

# Fix Issue — Metodología y Templates

Skill con templates, buenas prácticas y metodología para reportar, clasificar y gestionar issues/bugs en GlyphLog.

## When to use

- Al verificar si un error reportado realmente existe
- Al crear una HU/issue formal para un bug
- Al clasificar severidad de un problema
- Al redactar el body de un issue de GitHub con formato profesional
- Al cerrar un issue con un reporte de resolución

## 1. Checklist de verificación de errores

Antes de crear un issue, verifica que el error es real y reproducible:

```markdown
## Checklist de verificación

- [ ] **Leído el contexto**: AGENTS.md, project-context.md, código relevante
- [ ] **Reproducido el error**: se puede reproducir de forma consistente
  - [ ] Backend: test unitario, curl, o logs que confirmen el error
  - [ ] Frontend: reproducido en el navegador (Playwright o manual)
- [ ] **Identificada la causa raíz**: se sabe en qué archivo/función está el problema
- [ ] **Descartados falsos positivos**: no es un error de configuración local, datos de test, o cache
- [ ] **Evidencia capturada**: stack trace, screenshot, output de test, o log

### Si NO se reproduce
Reportar al usuario con:
1. Qué se intentó para reproducir
2. En qué entorno se probó
3. Posibles causas de que no se reproduzca (datos, config, timing)
4. Preguntar al usuario si tiene más contexto o pasos específicos
```

## 2. Guía de severidad

| Nivel | Etiqueta | Descripción | Ejemplo en GlyphLog |
|-------|----------|-------------|---------------------|
| P0 | `severity:blocker` | La app no funciona o pérdida de datos | Login roto, entradas se borran solas |
| P1 | `severity:critical` | Feature principal funciona mal | Crear entrada guarda datos incorrectos |
| P2 | `severity:major` | Feature secundario roto o UX degradada | Filtros no aplican correctamente |
| P3 | `severity:minor` | Cosmético o edge case poco frecuente | Tooltip cortado en móvil |

## 3. Template de issue/HU con INVEST para bugs

Cada issue de bug debe pasar los 6 criterios INVEST:

| Criterio | Pregunta de validación | Si no cumple → |
|----------|----------------------|----------------|
| **I**ndependent | ¿El fix funciona sin depender de otros cambios pendientes? | Identificar dependencias y resolver primero |
| **N**egotiable | ¿El enfoque del fix es negociable (aunque el resultado no)? | Documentar alternativas evaluadas |
| **V**aluable | ¿Resuelve un problema real que afecta al usuario? | Reconsiderar prioridad |
| **E**stimable | ¿Se puede estimar el esfuerzo? | Investigar más antes de crear el issue |
| **S**mall | ¿Es un solo bug, acotado? | Dividir en issues más pequeños |
| **T**estable | ¿Los criterios de aceptación son binarios? | Reescribir hasta que sean verificables |

### Template completo

```markdown
# [FIX] <Título descriptivo del bug>

> **Estado:** backlog
> **Prioridad:** <alta | media | baja>
> **Severidad:** <P0 | P1 | P2 | P3>
> **Dependencias:** ninguna | [TAREA-X]

## Contexto

<Qué existe actualmente y cómo debería funcionar>

## Bug reportado

**Descripción:** <Qué ocurre — una frase clara>
**Pasos para reproducir:**
1. <Paso 1>
2. <Paso 2>
3. Observar: <resultado actual>

**Resultado esperado:** <qué debería pasar>
**Resultado actual:** <qué pasa realmente>

**Evidencia:**
<Stack trace, screenshot, log, output de test>

## Análisis de causa raíz

**Archivo(s) afectado(s):** <rutas exactas>
**Causa identificada:** <descripción técnica de por qué ocurre>
**Impacto:** <qué otras partes del sistema podrían estar afectadas>

## Tareas técnicas

- [ ] <Subtarea 1: cambio específico en archivo específico>
- [ ] <Subtarea 2>
- [ ] Verificar que tests existentes siguen pasando
- [ ] Añadir test específico que cubra este bug

## Criterios de aceptación

- ✅ <Criterio binario 1 — ej: "GET /api/v1/entries/ con 0 entradas devuelve [] con status 200">
- ✅ <Criterio binario 2>
- ✅ El bug original ya no se reproduce
- ✅ No hay regresiones en tests existentes
- ✅ El código sigue las convenciones de AGENTS.md

## Notas técnicas

<Alternativas consideradas, decisiones, referencias>

## Archivos relevantes

- `apps/api/app/...`
- `apps/web/src/...`

## Validación INVEST

- [x] **Independent:** <justificación>
- [x] **Negotiable:** <justificación>
- [x] **Valuable:** <justificación>
- [x] **Estimable:** <justificación>
- [x] **Small:** <justificación>
- [x] **Testable:** <justificación>
```

## 4. Template para GitHub issue body

Formato markdown optimizado para el body de `gh issue create`:

```markdown
## 🐛 Bug Report

**Severidad:** P<N> — <blocker|critical|major|minor>

### Descripción
<Qué ocurre en una frase>

### Pasos para reproducir
1. <Paso 1>
2. <Paso 2>

### Resultado esperado
<Qué debería pasar>

### Resultado actual
<Qué pasa>

### Causa raíz identificada
**Archivo(s):** `<ruta>`
**Causa:** <descripción breve>

### Criterios de aceptación
- [ ] <Criterio 1>
- [ ] <Criterio 2>
- [ ] No hay regresiones

### Contexto adicional
<Stack trace, logs, screenshots, notas>
```

## 5. Template de reporte de cierre

Usar al finalizar la corrección del issue:

```markdown
## ✅ Issue #<N> — <Título>: RESUELTO

### Resumen del fix

**Causa raíz:** <qué causaba el bug>
**Solución aplicada:** <qué se hizo para corregirlo>

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `<ruta>` | <descripción breve> |

### Verificaciones

| Check | Resultado |
|-------|-----------|
| Bug original reproducido antes del fix | ✅ |
| Bug ya no se reproduce después del fix | ✅ |
| Tests existentes pasan | ✅ |
| Test nuevo cubre el caso del bug | ✅ |
| Lint (ruff/eslint) | ✅ |
| Build | ✅ |
| Revisión del Tech Lead | ✅ APROBADO |

### Próximos pasos
1. Commit de los cambios
2. <Sugerencias adicionales>
```

## 6. Buenas prácticas para fixes

1. **Un bug = un issue.** No mezclar correcciones de bugs distintos en el mismo issue.
2. **Test primero.** Escribir un test que falle con el bug antes de corregirlo (TDD del fix).
3. **Scope mínimo.** Solo tocar el código necesario para corregir el bug. No refactorizar de paso.
4. **Evidencia antes y después.** Documentar que el bug existía y que ya no existe.
5. **No asumir, preguntar.** Ante CUALQUIER duda sobre el comportamiento esperado, severidad, o alcance del fix → preguntar al usuario antes de proceder.
