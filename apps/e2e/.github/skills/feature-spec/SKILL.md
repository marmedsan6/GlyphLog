# Skill: Feature Spec — Structured Feature Specification for E2E Testing

## Overview

Esta skill guía al agente en la creación de especificaciones de feature completas y accionables para tests E2E con Playwright. Asegura documentación consistente antes de implementar tests, reduciendo ambigüedad y mejorando la cobertura.

---

## Trigger Phrases

Cualquiera de estas frases debe activar esta skill:
- "create a feature spec"
- "spec out a feature"
- "write a spec"
- "plan a feature"
- "feature planning"
- "document feature for testing"
- "create test plan for [feature]"
- "crea una spec"
- "planifica los tests de"

---

## Cuándo usar esta skill

✅ **Usar cuando:**
- Empiezas una nueva feature que requiere tests E2E
- Flujos de usuario complejos necesitan documentación antes de implementar
- Múltiples stakeholders necesitan alinearse en cobertura de tests
- Desglosar features grandes en unidades testeables
- Planificar escenarios de test para una página/sección

❌ **No usar cuando:**
- Escribir un test simple y aislado (implementar directo)
- Bug fix con test existente (actualizar test, no crear spec)
- Refactorizar tests existentes (sin nuevo comportamiento)

---

## Workflow

### Step 1: Gather Context

Hacer preguntas aclaratorias si es necesario:
- ¿Qué página/sección vamos a testear? (ej. "Formulario de creación de entrada", "Página de colección")
- ¿Qué flujos de usuario hay? (ej. "Usuario hace login → ve colección → crea entrada")
- ¿Existen Page Objects? (Revisar `e2e-tests/page-objects/`)
- ¿Existen tests similares? (Revisar `e2e-tests/tests/`)

### Step 2: Create Folder Structure

Crear carpeta en `specs/`:
```
specs/
└── feature-<name>/
    ├── feature-<name>-context.md       (Opcional - input del usuario)
    └── specs-<name>-funct-and-tech.md  (Spec generada con checklist)
```

**Convención de nombres:**
- Usar kebab-case: `feature-collection-page`, `feature-create-entry`
- Ser específico: ❌ `feature-test` ✅ `feature-collection-filters`

### Step 3: Generate Specification Document

Crear `specs-<name>-funct-and-tech.md` con estas secciones:

#### 3.1 Header
```markdown
# Feature Spec: [Feature Name]

**Created**: [Date]
**Status**: [ ] Not Started → [ ] In Progress → [ ] Complete
**Related Files**:
- Page Objects: `e2e-tests/page-objects/[PageName].ts`
- Tests: `e2e-tests/tests/[folder]/[name].spec.ts`
```

#### 3.2 Feature Description
```markdown
## 1. Feature Description

**What**: [Descripción breve de qué hace esta feature]
**Why**: [Por qué la testeamos - valor de negocio]
**Where**: [URL o ubicación de la página]
```

#### 3.3 User Flows
```markdown
## 2. User Flows

### Primary Flow: [Flow Name]
1. **Starting point**: [ej. "Usuario está en /collection"]
2. **Action**: [ej. "Usuario hace clic en '+ Nueva entrada'"]
3. **Expected result**: [ej. "Navega a /entries/new"]
4. **Verification**: [ej. "URL cambia, formulario de creación visible"]

### Alternative Flow: [Flow Name]
(Si aplica - casos de error, edge cases)
```

#### 3.4 Elements to Test
```markdown
## 3. Elements to Test

| Element | Selector Strategy | Expected Behavior | Test Priority |
|---------|-------------------|-------------------|---------------|
| [Element name] | `data-testid` / `getByRole` / `getByText` | [Qué debe hacer] | High/Medium/Low |

**Example:**
| Element | Selector Strategy | Expected Behavior | Test Priority |
|---------|-------------------|-------------------|---------------|
| Heading "Mi Colección" | `getByRole('heading', { name: 'Mi Colección' })` | Visible al cargar la página | High |
| Botón "+ Nueva entrada" | `getByRole('link', { name: /nueva entrada/i })` | Navega a /entries/new | High |
```

#### 3.5 Test Scenarios Checklist
```markdown
## 4. Test Scenarios

### Visibility Tests
- [ ] Test: Element X visible al cargar la página
- [ ] Test: Element Y aparece después de la acción Z

### Navigation Tests
- [ ] Test: Link A navega a la URL correcta
- [ ] Test: Botón back vuelve a la página anterior

### Interaction Tests
- [ ] Test: Click en botón dispara el comportamiento esperado
- [ ] Test: Formulario se envía con datos válidos
- [ ] Test: Formulario muestra error con datos inválidos
```

#### 3.6 Technical Approach
```markdown
## 5. Technical Approach

### Page Objects Required
- [ ] **Existing**: Usar `[ExistingPage].ts` para [reason]
- [ ] **New**: Crear `[NewPage].ts` con métodos:
  - `navigate()` - [description]
  - `get [element]()` - Devuelve Locator para [element]

### Test File Structure
- **Location**: `e2e-tests/tests/[folder]/[name].spec.ts`
- **Dependencies**: Import `[PageName]` from page-objects

### Known Challenges
- ⚠️ [Challenge 1]: [ej. "GlyphLog usa Google OAuth - requiere estado de sesión"]
  - **Solution**: [ej. "Usar storageState o mock del token"]
```

#### 3.7 Acceptance Criteria
```markdown
## 6. Acceptance Criteria

Feature is complete when:
- [ ] All test scenarios pass in Chromium, Firefox, WebKit
- [ ] Page Objects follow project conventions (see `e2e-tests/AGENTS.md`)
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] No hardcoded waits (`waitForTimeout`)
- [ ] All selectors in Page Objects (not in tests)
- [ ] Tests are independent (can run in any order)
```

---

## Output Format

**Siempre crear:**
1. Carpeta: `specs/feature-<name>/`
2. Archivo: `specs-<name>-funct-and-tech.md` (siguiendo el template)

**Opcionalmente crear:**
3. Archivo: `feature-<name>-context.md` (si el usuario da contexto complejo)

---

## Ejemplo de uso

### User Request:
```
"Create a feature spec for testing the collection page filters"
```

### Agent Response:
```
📋 Creating feature spec for Collection Page Filters...

✅ Created: specs/feature-collection-filters/
✅ Generated: specs-collection-filters-funct-and-tech.md

**Spec includes:**
- 3 primary user flows
- 8 elements to test (with selectors)
- 12 test scenarios (4 visibility, 3 navigation, 5 interaction)
- Technical approach (Page Object strategy)
- Acceptance criteria checklist

**Next steps:**
1. Review spec and add any missing scenarios
2. Create/update Page Objects (CollectionPage.ts)
3. Implement tests in e2e-tests/tests/collection/filters.spec.ts
```

---

## Quality Checklist

Antes de finalizar la spec, verificar:
- [ ] Todos los user flows documentados (happy path + error cases)
- [ ] Estrategias de selector especificadas (preferir getByRole/getByText en GlyphLog)
- [ ] Prioridades de test asignadas (High/Medium/Low)
- [ ] Known challenges abordados (auth, lazy loading, etc.)
- [ ] Acceptance criteria realistas y medibles
- [ ] Archivo guardado en la ubicación correcta (`specs/feature-<name>/`)

---

## Notas específicas de GlyphLog

**Stack y consideraciones:**
- ✅ Frontend: React 18 + Vite + shadcn/ui + Tailwind
- ✅ Backend: FastAPI (puerto 8000, proxy `/api` vía Vite)
- ✅ Auth: Google OAuth (`@react-oauth/google`) — tests autenticados necesitan storageState o mock
- ✅ Selectores: preferir `getByRole`, `getByText`, `getByPlaceholder` (shadcn/ui usa roles accesibles)
- ✅ Esperas: `waitForURL()` para navegación, `expect(locator).toBeVisible()` para elementos
- ❌ No usar `networkidle` — Vite HMR mantiene conexiones WebSocket activas
- ❌ No usar `waitForTimeout()` — usar auto-waiting de Playwright

**Referencia:** Ver `e2e-tests/AGENTS.md` para las convenciones completas.
