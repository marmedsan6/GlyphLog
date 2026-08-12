# @glyphlog/e2e — Agent Instructions

GlyphLog E2E testing suite. Playwright + Page Object Model sobre el monorepo Turborepo.

## Rutas de GlyphLog

| Ruta | Página | Auth |
|------|--------|------|
| `/` | Home (landing) | No |
| `/login` | Login (Google OAuth) | No |
| `/register` | Registro | No |
| `/collection` | Colección | Sí |
| `/entries/new` | Crear entrada | Sí |
| `/entries/:id` | Detalle | Sí |
| `/import` | Importar MAL | Sí |
| `/recommendations` | Recomendaciones | Sí |
| `/chat` | Chat IA | Sí |
| `/discover/youtube` | YouTube | Sí |
| `/profile` | Perfil | Sí |
| `/stats` | Estadísticas | Sí |

## Stack

- **Playwright Test** v1.58+ · TypeScript · dotenv
- Frontend: React 18 + Vite (puerto 5173)
- Backend: FastAPI (puerto 8000, proxy `/api` vía Vite)
- Auth: Google OAuth (`@react-oauth/google`)

## Comandos

```bash
pnpm test          # headless, todos los browsers
pnpm test:headed   # navegador visible
pnpm test:debug    # paso a paso
pnpm test:ui       # UI mode
pnpm test:e2e      # solo Chromium
pnpm test:report   # reporte HTML
```

## Convenciones de testing

- **Selector priority**: `data-testid` > `getByRole` > `getByText` > `getByPlaceholder`
- **Page Objects**: una clase por página, hereda `BasePage`
- **Locator getters**: devuelven `Locator` (no booleanos) → `await expect(page.logo).toBeVisible()`
- **Sin `waitForTimeout()`**: usar `waitForURL()`, `toBeVisible()`, etc.
- **Tests independientes**: sin orden de ejecución, sin estado compartido
- **AAA**: Arrange-Act-Assert en cada test
- **Naming**: `should [comportamiento] when [condición]`

## Estructura

```
e2e-tests/
├── page-objects/     # Page Objects (LoginPage, HomePage, CollectionPage...)
├── tests/            # Specs agrupados por feature (home/, auth/, collection/)
├── fixtures/         # Datos de prueba
└── utils/            # Helpers
```

## CI

`playwright.config.ts` lanza `pnpm dev` desde la raíz automáticamente (`webServer`).
En CI: `workers=1`, `retries=2`.
