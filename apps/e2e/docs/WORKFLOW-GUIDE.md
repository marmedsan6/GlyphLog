# 🔄 Workflow Completo: Añadir Tests E2E a GlyphLog

**Guía paso a paso para implementar nuevos tests E2E con soporte de IA**

---

## 📊 Visión General del Flujo

```
1. PLANIFICAR → 2. IMPLEMENTAR → 3. VERIFICAR → 4. DOCUMENTAR → 5. COMMIT
   (Feature Spec)  (Code)         (Tests)      (Update Docs)  (Git)
```

---

## 📋 FASE 1: Planificación con Feature Spec

### ¿Cuándo crear un spec?

| Situación | Crear Spec? |
|-----------|-------------|
| Feature con >3 tests | ✅ SÍ |
| Flujo complejo (múltiples pasos) | ✅ SÍ |
| Nueva página o sección | ✅ SÍ |
| Test simple (<3 escenarios) | ❌ NO - Implementar directo |
| Bug fix con test existente | ❌ NO - Actualizar test |

### Prompt para el Agente

```
"Create a feature spec for [nombre de la feature]"
```

**Ejemplos:**
```
✅ "Create a feature spec for testing the collection page filters"
✅ "Create a feature spec for the create entry form validation"
✅ "Create a feature spec for the login page"
```

### Lo Que Debes Proporcionar

1. **Nombre de la feature** — ej. "Collection filters", "Entry creation"
2. **URL donde está** — ej. `/collection`, `/entries/new`
3. **Qué hace el usuario** — ej. "Click en filtro Anime → ver solo entradas anime"
4. **Qué necesitas verificar** — ej. "Cards filtradas, contador actualizado, botón activo resaltado"

### Output Esperado

```
✅ Archivo creado: 
specs/feature-collection-filters/specs-collection-filters-funct-and-tech.md

Contiene:
- Feature description
- User flows (3-4 escenarios)
- Elements to test (tabla con prioridades)
- Test scenarios checklist (10-15 items)
- Technical approach (Page Objects needed)
- Acceptance criteria
- Known challenges (OAuth, lazy loading, etc.)
```

---

## 💻 FASE 2: Implementación

### Paso 2.1: Inspeccionar la Página (Si No Conoces Selectores)

```bash
pnpm test:headed
```

**Durante la ejecución:**
1. Usa Playwright Inspector (`F12` durante la prueba)
2. Encuentra selectores para elementos importantes
3. Anota: roles, texto, placeholders, data-testid
4. **Prioriza:** `getByRole` > `getByText` > `getByPlaceholder` > `data-testid`

**Para GlyphLog específicamente:**
- shadcn/ui usa roles ARIA — `getByRole('button')`, `getByRole('link')`
- Labels vinculados a inputs — `getByLabel('Email')`
- Usa texto visible como fallback — `getByText('Iniciar sesión')`

### Paso 2.2: Crear Page Object

**Prompt estructurado:**
```
"Create [PageName]Page.ts following the spec in specs/feature-[name]/

Include getters for:
- [elemento 1]
- [elemento 2]
- [elemento 3]

Follow patterns documented in e2e-tests/AGENTS.md"
```

**Ejemplo real:**
```
"Create CollectionFiltersPage.ts following the spec in specs/feature-collection-filters/

Include getters for:
- Filter buttons (anime, manga, game)
- Active filter indicator
- Filtered entry cards count
- Clear filters button

Follow patterns documented in e2e-tests/AGENTS.md"
```

**✅ Verificar:**
- [ ] Extiende `BasePage` (o `AppLayout` si es página protegida)
- [ ] Getters retornan `Locator` (no `Promise<boolean>`)
- [ ] Usa `getByRole`, `getByText`, `getByLabel` (no CSS)
- [ ] Sin `networkidle` (Vite HMR)

### Paso 2.3: Crear Tests

**Prompt estructurado:**
```
"Create [name].spec.ts with tests from the spec checklist

Implement:
- [ ] Test 1: [descripción exacta del spec]
- [ ] Test 2: [descripción exacta del spec]
- [ ] Test 3: [descripción exacta del spec]

Follow AAA pattern and use [PageName]Page"
```

**Ejemplo real:**
```
"Create collection-filters.spec.ts with tests from the spec checklist

Implement:
- [ ] Filter by anime shows only anime entries
- [ ] Filter by manga shows only manga entries  
- [ ] Active filter has highlighted style
- [ ] Clear filter shows all entries

Follow AAA pattern and use CollectionPage"
```

**Output esperado:**
```typescript
import { test, expect } from '@playwright/test';
import { CollectionPage } from '../../page-objects/CollectionPage';

test.describe('Collection Filters', () => {
  
  test('should filter entries by anime type', async ({ page }) => {
    // ARRANGE
    const collectionPage = new CollectionPage(page);
    await collectionPage.navigate();
    
    // ACT
    await collectionPage.filterByType('anime');
    
    // ASSERT
    await expect(collectionPage.entryCards.first()).toBeVisible();
  });
});
```

**✅ Verificar estructura AAA:**
- [ ] `// ARRANGE` — Setup
- [ ] `// ACT` — Acción del usuario
- [ ] `// ASSERT` — Verificaciones
- [ ] Nombre descriptivo: `should [behavior] when [condition]`
- [ ] Usa `await expect(locator).toBeVisible()` (no booleans)

---

## ✅ FASE 3: Verificación

### Paso 3.1: Ejecutar Tests en Chromium (Headed Mode)

```bash
pnpm test:headed -- collection/filters.spec.ts
```

**Durante la ejecución, verificar:**
- ✅ Todos los tests pasan
- ✅ No hay `waitForTimeout` en el código
- ✅ Selectores encuentran elementos correctamente
- ✅ Navegación funciona sin timeouts

**Errores comunes:**
| Error | Causa | Solución |
|-------|-------|----------|
| `TimeoutError: Locator not found` | Selector incorrecto | Inspeccionar con F12, verificar roles |
| `Error: strict mode violation` | Múltiples elementos coinciden | Usar `.first()` o selector más específico |
| `Element not clickable` | Elemento cubierto por overlay | Esperar con `toBeVisible()` primero |

### Paso 3.2: Multi-Browser

```bash
pnpm test -- collection/filters.spec.ts
```

**Output esperado:**
```
✅ Chromium: 4 passed (4s)
✅ Firefox: 4 passed (5s)
✅ WebKit: 4 passed (6s)
```

### Paso 3.3: Marcar Tests Completos en el Spec

```
"Mark the implemented tests as complete in the feature spec"
```

```diff
### Test Scenarios
- [x] Test: Filter by anime shows only anime entries ✅ IMPLEMENTED
- [x] Test: Active filter has highlighted style ✅ IMPLEMENTED
```

---

## 📚 FASE 4: Documentación

### Actualizar AGENTS.md o learnings

**Prompt:**
```
"Update e2e-tests/AGENTS.md — document any new patterns discovered"
```

**Ejemplo de actualización:**
```markdown
## Project-Specific Patterns — Collection

### Pattern: Filter buttons in shadcn/ui
**Challenge:** Botones de filtro usan Button component de shadcn
**Solution:** `getByRole('button', { name: /anime/i })`

**Code reference:** `e2e-tests/tests/collection/filters.spec.ts`
```

---

## 🔄 FASE 5: Commit

### Mensaje Estructurado (Conventional Commits)

```
feat(e2e): Add collection filter E2E tests

## Implementation
- Created CollectionPage.filterByType() method
- Implemented 4 tests following AAA pattern:
  - Filter by anime, manga, game types
  - Active filter visual state

## Verification
- All tests passing in Chromium (4/4)
- Multi-browser verified (12/12 total)
- No waitForTimeout or anti-patterns

## Documentation
- Documented shadcn/ui filter button pattern
- Marked spec as complete
```

---

## 📖 GUÍA RÁPIDA — Templates de Prompts

```bash
# FASE 1: Planificación
"Create a feature spec for testing the [feature name]"

# FASE 2: Implementación  
"Create [PageName]Page.ts following spec in specs/feature-[name]/
Include getters for: [elementos]
Follow patterns in e2e-tests/AGENTS.md"

"Create [name].spec.ts with tests from spec checklist
Implement: [tests list]
Follow AAA pattern and use [PageName]Page"

# FASE 3: Verificación
"Run the new tests in headed mode"
"Run the new tests in all browsers"
"Mark implemented tests as complete in the spec"

# FASE 4: Documentación
"Update e2e-tests/AGENTS.md — document new patterns discovered"

# FASE 5: Git
"Commit with structured message following conventional commits"
```

---

## 🎯 Checklist Definitivo

### Antes de Empezar
```
☐ Tengo clara la feature a testear
☐ Conozco la URL y flujo básico del usuario
☐ Sé qué elementos necesito verificar
```

### Implementación
```
☐ Feature spec creado en specs/feature-[name]/
☐ Page Object creado ([PageName]Page.ts)
☐ Page Object sigue pattern: getters returning Locators
☐ Tests creados ([name].spec.ts)
☐ Tests siguen AAA pattern
```

### Verificación
```
☐ Tests pasan en Chromium headed mode
☐ Tests pasan en multi-browser
☐ No hay timeouts fijos (waitForTimeout)
☐ Spec marcado con [x] para tests completados
```

### Documentación
```
☐ Patrones nuevos documentados en e2e-tests/AGENTS.md
☐ Spec actualizado con progreso
```

---

## 💡 Tips Clave

### 1. Selectores para shadcn/ui

```typescript
// ✅ CORRECTO
getByRole('button', { name: 'Iniciar sesión' })
getByRole('link', { name: 'Registrarse' })
getByLabel('Email')
getByPlaceholder('buscar...')
getByRole('heading', { name: 'GlyphLog' })

// ❌ EVITAR
page.locator('.bg-primary.rounded-md')  // clases Tailwind
page.locator('button:nth-child(2)')     // selector posicional
```

### 2. Estrategia de espera

```typescript
// ✅ Navegación React Router
await page.waitForURL('/collection');

// ✅ Elementos que cargan vía API
await expect(card.first()).toBeVisible({ timeout: 15000 });

// ✅ Skeleton → Contenido
await expect(skeleton).not.toBeVisible();

// ❌ NUNCA
await page.waitForLoadState('networkidle'); // Vite HMR
await page.waitForTimeout(5000);            // Espera arbitraria
```

### 3. Auth (Google OAuth)

Para tests de páginas protegidas:
- Guardar estado de sesión con `page.context().storageState()`
- Reutilizar en `playwright.config.ts` → `storageState: 'playwright/.auth/user.json'`
- O mockear el token JWT en localStorage

### 4. Multi-Browser es Obligatorio Antes de Commit

```bash
pnpm test -- [name].spec.ts
```

---

## ⚠️ Errores Comunes a Evitar

| Error | Consecuencia | Solución |
|-------|--------------|----------|
| **No crear spec primero** | Tests incompletos, edge cases olvidados | Fase 1 antes de código |
| **Usar CSS selectors en shadcn** | Tests frágiles con cambios de Tailwind | `getByRole`, `getByText` |
| **No verificar multi-browser** | Tests fallan en Firefox/WebKit | `pnpm test` antes de commit |
| **Usar `waitForTimeout`** | Tests lentos, flaky en CI | `toBeVisible()`, `waitForURL()` |
| **Usar `networkidle`** | Tests cuelgan (Vite HMR) | `domcontentloaded` + `toBeVisible()` |
| **Retornar booleans de getters** | Sin auto-waiting | Getters retornan Locator |

---

**Creado:** 2026-08-11  
**Última actualización:** 2026-08-11  
**Versión:** 1.0 — Adaptado para GlyphLog
