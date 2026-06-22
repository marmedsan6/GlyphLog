---
name: qa-senior
description: "Use when testing web applications, creating test plans, writing Playwright E2E tests, generating QA reports, or performing exploratory testing. Covers test plan templates, bug reporting, technical/non-technical reporting, and QA best practices."
---

# QA Senior — Metodología y Prácticas de Testing

## 1. Flujo de trabajo del QA

### 1.1 Fase de análisis
1. **Entender el feature**: leer la descripción, criterios de aceptación, y el código existente
2. **Identificar flujos**: flujo feliz, flujos alternativos, flujos de error
3. **Evaluar riesgo**: qué partes son críticas, qué puede romperse

### 1.2 Fase de planificación
1. Definir el alcance: qué se testea y qué NO
2. Elegir la estrategia: unitario, integración, E2E, exploratorio
3. Crear el **plan de pruebas**

### 1.3 Fase de ejecución
1. Ejecutar tests automatizados (Playwright)
2. Realizar testing exploratorio manual
3. Documentar bugs y hallazgos

### 1.4 Fase de reporte
1. **Reporte técnico**: para developers (bugs, stack traces, logs, PRs)
2. **Reporte no técnico**: para stakeholders (resumen, impacto, riesgos)

---

## 2. Template de Plan de Pruebas

```markdown
# Plan de Pruebas: [Nombre del Feature/Componente]

## Alcance
- **Funcionalidades a testear**: [lista]
- **Fuera de alcance**: [lista]
- **Browser/Dispositivo**: Chrome, Firefox, Safari, mobile

## Estrategia
- [ ] Tests unitarios (lógica de negocio)
- [ ] Tests de integración (API)
- [ ] Tests E2E (Playwright)
- [ ] Testing exploratorio

## Escenarios Críticos
| ID | Escenario | Tipo | Prioridad |
|----|-----------|------|-----------|
| TC-01 | [descripción] | happy path | P0 |
| TC-02 | [descripción] | error | P0 |

## Criterios de Aceptación QA
- ✅ Todos los P0 pasan sin blockers
- ✅ No hay regresiones en flujos existentes
- ✅ Los mensajes de error son claros para el usuario
- ✅ El rendimiento es aceptable (carga < 2s)
```

---

## 3. Template de Bug Report

```markdown
## Bug: [Título descriptivo]

### Entorno
- Browser/OS: Chrome 120 / Ubuntu 24.04
- Estado actual: main / feature-branch / commit abc123

### Severidad
[ ] Blocker — impide usar el feature por completo
[ ] Critical — el feature funciona pero con datos incorrectos
[ ] Major — comportamiento incorrecto en flujo secundario
[ ] Minor — issue cosmético o de UX

### Pasos para reproducir
1. Ir a `[URL]`
2. Hacer clic en `[elemento]`
3. Observar `[resultado actual]`

### Resultado esperado
[qué debería pasar]

### Resultado actual
[qué pasa realmente]

### Evidencia
[Screenshot, video, HAR file, console logs]

### Notas adicionales
[Contexto, posible causa, suggested fix]
```

---

## 4. Template de Reporte Técnico

```markdown
# Reporte Técnico de Testing — [Feature/Fecha]

## Resumen Ejecutivo
- **Features testeados**: [lista]
- **Tests ejecutados**: [N] (E2E: [N], API: [N])
- **Bugs encontrados**: [N] (P0: [N], P1: [N], P2+: [N])
- **Coverage estimado**: [%]

## Bugs por severidad
### Blocker / Critical
- [BUG-001] — [link al bug]
### Major
- [BUG-002] — [link al bug]

## Regresiones detectadas
- [descripción de regresiones]

## Riesgos y recomendaciones
- [Riesgo 1] → [Recomendación]
- [Riesgo 2] → [Recomendación]

## Hallazgos adicionales
- [Deuda técnica, problemas de accesibilidad, etc.]
```

---

## 5. Template de Reporte No Técnico

```markdown
# Resumen de Calidad — [Feature/Fecha]

## ¿Qué se probó?
[Explicación en lenguaje simple de qué se testeo]

## Resultados principales
✅ [Lo que funciona bien]
⚠️ [Problemas conocidos]
❌ [Bloqueadores]

## Impacto para el usuario
[Qué significa esto para quien usa la app]

## Próximos pasos
- [Acciones recomendadas antes de release]
```

---

## 6. Buenas Prácticas de QA

### Tests E2E con Playwright
- **Selectores**: preferir `getByRole`, `getByText`, `getByTestId` sobre selectores CSS/XPath frágiles
- **Independencia**: cada test debe poder correr solo sin depender de otros
- **Data**: usar fixtures/data factories, no depender de datos de BD real
- **Esperas**: evitar `page.waitFor(1000)`; usar `waitForSelector`, `waitForResponse`, `toBeVisible`
- **Page Object Model**: encapsular selectores e interacciones en page objects
- **Grab & Replay**: no confiar ciegamente en tests grabados; revisar y refactorizar

### Testing Exploratorio
- Usar heurísticas: entrada vacía, caracteres especiales, valores límite, doble clic, navegación con botón atrás
- Testear en diferentes browsers cuando sea relevante
- Probar con red lenta (throttling)

### Reportes
- Los bugs deben ser **reproducibles**: si no se puede reproducir consistentemente, documentar frecuencia
- Un bug sin evidencia no es un bug → siempre incluir screenshot o video
- Separar hallazgos de UX de bugs funcionales
