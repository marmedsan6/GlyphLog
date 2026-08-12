# 🤖 Guía de Mejora de Archivos de IA — Sistema de Instrucciones para Agentes

## 📚 Índice
1. [¿Qué son estos archivos?](#qué-son-estos-archivos)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Cómo impactan en el trabajo](#cómo-impactan-en-el-trabajo)
4. [Mejores prácticas](#mejores-prácticas)
5. [Ejemplos prácticos](#ejemplos-prácticos)

---

## ¿Qué son estos archivos?

Estos archivos **entrenan al agente de IA** (como GitHub Copilot o Claude) para que:
- Conozca las reglas específicas de tu proyecto
- Siga patrones establecidos
- Recuerde decisiones técnicas
- No repita errores
- Sea más eficiente en cada sesión

**Sin estos archivos**: El agente empieza desde cero cada vez, comete los mismos errores, ignora tus preferencias.

**Con estos archivos**: El agente se comporta como un desarrollador que conoce tu proyecto.

---

## Arquitectura del Sistema

```
apps/e2e/
├── AGENTS.md                          # 🌍 GLOBAL - Reglas para el workspace E2E
│   ├── Rutas de GlyphLog              # Mapa de páginas públicas/protegidas
│   ├── Convenciones de testing        # Selector strategy, AAA, POM
│   └── Comandos                       # pnpm test, test:headed, test:debug
│
├── e2e-tests/
│   └── AGENTS.md                      # 📂 LOCAL - Reglas específicas de Playwright
│       ├── Playwright Best Practices  # Cómo escribir tests
│       ├── Page Object Pattern        # Arquitectura de código
│       ├── Selector Strategy          # Cómo encontrar elementos (shadcn/ui)
│       └── Test Structure             # Formato AAA
│
└── .github/skills/                    # 🎯 SKILLS - Workflows especializados
    └── feature-spec/                  # Planificar tests antes de escribirlos
```

---

## Cómo impactan en el trabajo

### 1. `AGENTS.md` (Workspace E2E)

**Función**: Instrucciones globales que aplican a TODO el workspace de testing.

**Impacto**:
- ✅ El agente sabe qué comandos ejecutar (`pnpm test`, `pnpm test:headed`)
- ✅ Conoce las rutas de GlyphLog (públicas vs protegidas)
- ✅ Sigue patrones de PR y documentación

**Ejemplo de impacto**:
```markdown
# Sin AGENTS.md
Usuario: "ejecuta los tests"
Agente: "npx playwright test" ❌ (comando incorrecto)

# Con AGENTS.md
Usuario: "ejecuta los tests"
Agente: "pnpm test" ✅ (comando correcto del proyecto)
```

### 2. `e2e-tests/AGENTS.md` (Específico de Playwright)

**Función**: Instrucciones para trabajar con Playwright y tests E2E.

**Impacto**:
- ✅ Crea tests siguiendo el patrón AAA (Arrange-Act-Assert)
- ✅ Usa Page Objects correctamente
- ✅ No hardcodea selectores en tests
- ✅ Evita `waitForTimeout()` (mala práctica)
- ✅ Usa `expect(locator).toBeVisible()` en lugar de booleanos

**Ejemplo de impacto**:
```typescript
// Sin e2e-tests/AGENTS.md
test('verify page', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(5000); // ❌ Espera activa
  const heading = page.locator('h1'); // ❌ Selector hardcodeado
  const visible = await heading.isVisible();
  expect(visible).toBeTruthy(); // ❌ Mal patrón
});

// Con e2e-tests/AGENTS.md
test('should display home heading on page load', async ({ page }) => {
  const homePage = new HomePage(page); // ✅ Page Object
  await homePage.navigate();
  await expect(homePage.heading).toBeVisible(); // ✅ Auto-waiting
});
```

---

## Mejores prácticas para MEJORAR estos archivos

### 📝 Regla 1: Sé específico, no genérico

❌ **Malo**:
```markdown
## Selectores
- Usa buenos selectores
```

✅ **Bueno**:
```markdown
## Selector Strategy (Priority Order)
1. `data-testid` attributes (preferred)
2. Accessible roles: `page.getByRole('button', { name: 'Submit' })`
3. Text content: `page.getByText('Iniciar sesión')`
4. Placeholder: `page.getByPlaceholder('buscar...')`
5. CSS selectors (last resort)

**Project-specific**:
- GlyphLog usa shadcn/ui — los componentes tienen roles ARIA accesibles
- Preferir `getByRole` sobre selectores CSS
- Vite HMR mantiene WebSocket — no usar `networkidle`
```

### 📝 Regla 2: Documenta DECISIONES, no solo código

❌ **Malo**:
```markdown
## Tests
- Escribimos tests para el home page
```

✅ **Bueno**:
```markdown
## Tests
- ✅ Homepage: 6 tests verificando elementos visibles y navegación
- ✅ Login page: 5 tests verificando formulario y links
- ❌ NOT testing Google OAuth flow — requiere cuenta Google real
- 🔄 PENDING: Tests de páginas protegidas (collection, create entry)

**Decision**: No testear Google OAuth callback directamente
**Reason**: El callback depende de Google — no podemos mockear el flujo completo sin una cuenta real
**Alternative**: Usar storageState con sesión pre-guardada para saltar el login
```

### 📝 Regla 3: Incluye EJEMPLOS concretos

❌ **Malo**:
```markdown
## Page Objects
- Usa getters para locators
```

✅ **Bueno**:
```markdown
## Page Objects - Locator Pattern

**ALWAYS use getters that return Locators, NEVER methods that return booleans**

❌ BAD:
```typescript
async isHeadingVisible(): Promise<boolean> {
  return await this.page.locator(this.heading).isVisible();
}
```

✅ GOOD:
```typescript
get heading() {
  return this.page.getByRole('heading', { name: 'GlyphLog' });
}

// Usage in test:
await expect(homePage.heading).toBeVisible();
```

**Why**: Playwright's auto-waiting only works with locators, not booleans.
```

### 📝 Regla 4: Actualiza después de CADA problema resuelto

Cuando resuelvas un bug o encuentres algo inesperado:

```markdown
## Añadir a AGENTS.md o learnings

### Issue: Tests de colección fallan con timeout
**Date**: 2026-08-11
**Problem**: Tests de /collection hacen timeout esperando las entry cards
**Root cause**: La página renderiza skeleton primero, los datos llegan después vía API
**Solution**: 
- Usar `expect(collectionPage.entryCards.first()).toBeVisible()` en lugar de verificar count
- No verificar contenido específico hasta que las cards estén visibles
- Configurar timeout más alto (30s) para páginas con carga de API

**Code reference**: `e2e-tests/tests/collection/collection.spec.ts`
```

---

## Ejemplos prácticos de mejora

### Ejemplo 1: Mejora de `e2e-tests/AGENTS.md`

Añadir sección específica del proyecto:

```markdown
## Project-Specific Constraints — GlyphLog

### Stack
- **Frontend**: React 18 + Vite (puerto 5173)
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: FastAPI (puerto 8000, proxy /api vía Vite)
- **Auth**: Google OAuth (@react-oauth/google)

### Selector Strategy for shadcn/ui
```typescript
// Botones — usar getByRole (shadcn Button tiene role="button")
page.getByRole('button', { name: 'Iniciar sesión' })

// Links — usar getByRole (shadcn Link renderiza <a>)
page.getByRole('link', { name: 'Registrarse' })

// Inputs — usar getByLabel (shadcn Label + Input están vinculados)
page.getByLabel('Email')

// Headings — usar getByRole
page.getByRole('heading', { name: 'GlyphLog' })
```

### Waiting Strategy
```typescript
// Para navegación entre páginas (React Router)
await page.waitForURL('/collection');

// Para elementos que aparecen tras carga de API
await expect(collectionPage.entryCards.first()).toBeVisible({ timeout: 15000 });

// Para skeleton → contenido
await expect(collectionPage.entryCards.first()).toBeVisible();
await expect(page.locator('.animate-pulse')).not.toBeVisible(); // skeleton desapareció

// NUNCA usar networkidle (Vite HMR mantiene WebSocket)
// NUNCA usar waitForTimeout fijo
```
```

---

## 🎯 Acción Inmediata: ¿Qué hacer AHORA?

### 1. Actualiza `e2e-tests/AGENTS.md`
Añade secciones con patrones específicos de GlyphLog (shadcn/ui selectors, OAuth, Vite HMR).

### 2. Documenta patrones descubiertos
Cada vez que resuelvas un problema de testing, documéntalo:
- Auth: cómo manejar Google OAuth en tests
- shadcn/ui: selectores que funcionan y los que no
- API calls: cómo esperar datos asíncronos sin timeouts fijos

### 3. Crea specs para features nuevas
Usa la skill `feature-spec` antes de implementar tests complejos.

---

## 🚀 Resultado Esperado

Después de mejorar estos archivos:

1. **Próxima sesión**: El agente recuerda TODO sobre los tests de GlyphLog
2. **Nuevos tests**: Seguirán automáticamente los patrones correctos
3. **Errores**: No se repetirán (están documentados)
4. **Velocidad**: Respuestas más rápidas (no necesita re-aprender)
5. **Calidad**: Código consistente con tus convenciones

---

## 📖 Referencias

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [shadcn/ui Accessibility](https://ui.shadcn.com/)
