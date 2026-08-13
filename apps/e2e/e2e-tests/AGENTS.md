# @glyphlog/e2e — Playwright Testing Guide

Tests end-to-end para GlyphLog con Playwright y Page Object Model (POM).
El proyecto raíz es un monorepo Turborepo + pnpm workspaces.

## Stack

| Componente | Detalle |
|-----------|---------|
| **Framework** | Playwright Test v1.58+ (Node.js) |
| **Lenguaje** | TypeScript |
| **Patrón** | Page Object Model (POM) |
| **Browsers** | Chromium, Firefox, WebKit |
| **Frontend** | React 18 + Vite (puerto 5173) |
| **Backend** | FastAPI (puerto 8000, proxy `/api` vía Vite) |
| **Auth** | Google OAuth (`@react-oauth/google`) |
| **UI** | shadcn/ui + Tailwind CSS |

## Comandos

```bash
pnpm test          # headless, todos los browsers
pnpm test:headed   # navegador visible
pnpm test:debug    # paso a paso
pnpm test:ui       # UI mode interactivo
pnpm test:e2e      # solo Chromium
pnpm test:report   # abrir reporte HTML
```

## Estructura

```
e2e-tests/
├── page-objects/     # Page Object classes (una por página)
│   ├── BasePage.ts   # Clase base con métodos comunes
│   ├── HomePage.ts   # Landing page
│   ├── LoginPage.ts  # Google OAuth login
│   └── ...
├── tests/            # Specs (*.spec.ts) agrupados por feature
│   ├── home/         # Tests de landing page
│   ├── auth/         # Tests de autenticación
│   ├── collection/   # Tests de colección
│   └── ...
├── fixtures/         # Datos de prueba
└── utils/            # Helpers
```

## Page Object Model

### Principios

1. **Una clase por página** — encapsula UI e interacciones
2. **Selectores en la clase** — no dispersos en tests
3. **Métodos de negocio** — `login()`, no `fillEmail().then(fillPassword())`
4. **Heredan de BasePage** — reutiliza navegación y helpers
5. **Sin lógica de test** — los Page Objects son solo abstracción de UI

### BasePage

`page-objects/BasePage.ts` proporciona:

| Método | Propósito |
|--------|---------|
| `goto(path)` | Navegar a una ruta |
| `click(selector)` | Click en elemento |
| `fill(selector, text)` | Rellenar input |
| `type(selector, text)` | Escribir carácter por carácter |
| `getText(selector)` | Obtener texto |
| `isVisible(selector)` | Verificar visibilidad |
| `waitForElement(selector)` | Esperar elemento |
| `elementExists(selector)` | Verificar existencia en DOM |
| `waitForURL(pattern)` | Esperar cambio de URL |
| `waitForPageLoad(state)` | Esperar estado de carga |
| `getCurrentURL()` | URL actual |
| `reload()` | Recargar página |
| `getLocator(selector)` | Obtener Locator |

### Ejemplo: LoginPage

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  private readonly googleButton = '[data-testid="google-login-button"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate() {
    await this.goto('/login');
  }

  get googleLoginButton() {
    return this.page.locator(this.googleButton);
  }

  get heading() {
    return this.page.getByRole('heading', { name: /inicia sesión|log in/i });
  }
}
```

### Uso en tests

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from '../../page-objects/HomePage';

test.describe('Home Page', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate();
  });

  test('should display hero heading on page load', async () => {
    await expect(homePage.heroHeading).toBeVisible();
  });

  test('should navigate to login when clicking CTA', async ({ page }) => {
    await homePage.ctaButton.click();
    await expect(page).toHaveURL('/login');
  });
});
```

## Estrategia de selectores

### Prioridad (mejor → peor)

1. **`data-testid`** ✅ — atributo específico para testing, no se rompe con cambios de estilo
2. **Roles accesibles** ✅ — `getByRole('button', { name: 'Login' })`, `getByLabel('Email')`
3. **Texto visible** ✅ — `getByText('Iniciar sesión')`
4. **Placeholder** — `getByPlaceholder('buscar...')`
5. **CSS selectors** ⚠️ — frágiles, evitar si es posible
6. **XPath** ❌ — último recurso

GlyphLog usa **shadcn/ui** que ya incluye roles accesibles en sus componentes. Preferir `getByRole` cuando sea posible.

## Test Naming

Patrón: `should [comportamiento esperado] when [condición]`

```typescript
test('should display login button when page loads', ...)
test('should redirect to collection when login succeeds', ...)
test('should show error when Google OAuth fails', ...)
```

## AAA (Arrange-Act-Assert)

```typescript
test('should filter entries by type', async ({ page }) => {
  // ARRANGE - datos y precondiciones
  const collectionPage = new CollectionPage(page);
  await collectionPage.navigate();

  // ACT - acción a probar
  await collectionPage.filterByType('anime');

  // ASSERT - verificar resultado
  await expect(collectionPage.entryCards).toHaveCount(5);
});
```

## CI

`playwright.config.ts` lanza `pnpm dev` desde la raíz automáticamente (`webServer`).
En CI: `CI=true` → `workers=1`, `retries=2`.

```bash
# En GitHub Actions / Azure Pipelines:
cd apps/e2e && pnpm test
```

