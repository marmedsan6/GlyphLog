# Feature Spec: Collection Page Testing

**Created**: 2026-08-11
**Status**: [x] Not Started → [ ] In Progress → [ ] Complete
**Related Files**:
- Page Objects: `e2e-tests/page-objects/CollectionPage.ts` (exists), `e2e-tests/page-objects/AppLayout.ts` (exists)
- Tests: `e2e-tests/tests/collection/collection.spec.ts` (to be created)

---

## 1. Feature Description

**What**: La página de colección (`/collection`) es la vista principal de GlyphLog. Muestra un grid con todas las entradas del usuario, filtros por tipo (anime/manga/game), barra de búsqueda, selector de ordenación, paginación y acceso a crear nuevas entradas.

**Why**: Es la página más visitada de la app — el 90% del flujo de usuario pasa por aquí. Necesita cobertura sólida de tests.

**Where**: 
- URL: `/collection` (requiere autenticación)
- Page Object: `CollectionPage.ts` (extiende `AppLayout`)

---

## 2. User Flows

### Primary Flow: Ver colección
1. **Starting point**: Usuario autenticado
2. **Action**: Navega a `/collection`
3. **Expected result**: Grid de entradas visible con heading "Mi Colección"
4. **Verification**: Heading visible, count de entradas, tarjetas renderizadas

### Primary Flow: Filtrar por tipo
1. **Starting point**: Usuario en `/collection` con entradas de varios tipos
2. **Action**: Click en botón de filtro "Anime"
3. **Expected result**: Solo se muestran entradas de tipo anime
4. **Verification**: Count de tarjetas cambia, botón activo resaltado

### Alternative Flow: Colección vacía
1. **Starting point**: Usuario nuevo sin entradas
2. **Action**: Navega a `/collection`
3. **Expected result**: Muestra estado vacío con CTA "Crear primera entrada"
4. **Verification**: Empty state visible, botón navega a `/entries/new`

### Error Flow: Fallo de API
1. **Starting point**: API no disponible
2. **Action**: Navega a `/collection`
3. **Expected result**: Muestra ErrorState con botón de retry
4. **Verification**: Mensaje de error visible, botón de retry clickable

---

## 3. Elements to Test

| Element | Selector Strategy | Expected Behavior | Test Priority |
|---------|-------------------|-------------------|---------------|
| Heading "Mi Colección" | `getByRole('heading', { name: 'Mi Colección' })` | Visible al cargar | High |
| Contador de entradas | `getByText(/\d+ (entradas|entrada)/)` | Muestra total correcto | High |
| Botón "+ Nueva entrada" | `getByRole('link', { name: /nueva entrada/i })` | Navega a /entries/new | High |
| Botones de filtro | `locator('[data-testid="entry-filters"] button')` | 3 botones (anime/manga/game) | Medium |
| Grid de tarjetas | `locator('[data-testid="entry-card"]')` | Múltiples tarjetas visibles | High |
| Selector de ordenación | `getByRole('combobox')` | Cambia orden de entradas | Medium |
| Paginación | `locator('[data-testid="entry-pagination"]')` | Visible si hay >1 página | Medium |
| Empty state | `getByText('Aún no tienes entradas')` | Visible cuando colección vacía | Medium |
| Error state | `getByText(/no se pudo cargar/i)` | Visible cuando API falla | Low |
| Search bar (AppLayout) | `getByPlaceholder(/buscar/i)` | Filtra entradas por texto | Medium |

---

## 4. Test Scenarios

### Visibility Tests
- [ ] Test: Heading "Mi Colección" visible al cargar
- [ ] Test: Contador de entradas visible y muestra número correcto
- [ ] Test: Botón "+ Nueva entrada" visible
- [ ] Test: Grid de tarjetas visible con entradas
- [ ] Test: Botones de filtro visibles (3 tipos)

### Navigation Tests
- [ ] Test: "+ Nueva entrada" navega a `/entries/new`
- [ ] Test: Click en entry card navega a `/entries/:id`
- [ ] Test: Logo "GlyphLog" en header navega a `/collection`

### Filtering Tests
- [ ] Test: Filtro "Anime" muestra solo entradas de ese tipo
- [ ] Test: Filtro "Manga" muestra solo entradas de ese tipo
- [ ] Test: Filtro "Game" muestra solo entradas de ese tipo
- [ ] Test: Botón activo tiene estilo resaltado

### Empty/Error States
- [ ] Test: Colección vacía muestra empty state con CTA
- [ ] Test: "Crear primera entrada" navega a `/entries/new`
- [ ] Test: Error de API muestra ErrorState con botón retry

### Responsive Tests (Opcional)
- [ ] Test: Grid se adapta a mobile (1 columna)
- [ ] Test: Filtros se mantienen accesibles en tablet

---

## 5. Technical Approach

### Page Objects Required

#### Existing
- [x] **Use**: `CollectionPage.ts` (extends AppLayout)
  - Getters: `heading`, `entryCount`, `newEntryButton`, `filterButtons`, `entryCards`, `pagination`
  - Methods: `navigate()`, `clickNewEntry()`, `filterByType(type)`
- [x] **Use**: `AppLayout.ts`
  - Getters: `logo`, `searchBar`, `navCollection`

### Test File Structure
- **Location**: `e2e-tests/tests/collection/collection.spec.ts`
- **Dependencies**: 
  ```typescript
  import { test, expect } from '@playwright/test';
  import { CollectionPage } from '../../page-objects/CollectionPage';
  ```
- **Test Structure**: AAA pattern
  ```typescript
  test('should display collection heading on page load', async ({ page }) => {
    // ARRANGE
    const collectionPage = new CollectionPage(page);
    
    // ACT
    await collectionPage.navigate();
    
    // ASSERT
    await expect(collectionPage.heading).toBeVisible();
  });
  ```

### Known Challenges

**Challenge 1**: Requiere autenticación (Google OAuth)
- **Solution**: Usar `storageState` con sesión guardada, o mock del token en `beforeEach`

**Challenge 2**: Datos dependen de API (no deterministicos)
- **Solution**: Para tests E2E reales, seedear la BD con datos de prueba conocidos. Para smoke tests, verificar estructura (heading, grid, filtros) sin depender de contenido específico.

**Challenge 3**: shadcn/ui components tienen estructura interna compleja
- **Solution**: Usar roles accesibles (`getByRole`, `getByText`) en lugar de clases CSS o estructura DOM

---

## 6. Acceptance Criteria

Feature is complete when:
- [ ] All test scenarios pass in Chromium, Firefox, WebKit
- [ ] `CollectionPage.ts` covers all elements listed above
- [ ] All tests follow AAA pattern (Arrange-Act-Assert)
- [ ] No hardcoded waits (`waitForTimeout`)
- [ ] All selectors in Page Objects (not in test files)
- [ ] Tests are independent (can run in any order)
- [ ] Auth state handled correctly (storageState or mock)

---

## 7. Implementation Notes

### Order of Implementation
1. Configurar auth state para tests (storageState con Google OAuth)
2. Verificar que `CollectionPage.ts` tenga todos los getters necesarios
3. Escribir smoke test (heading visible)
4. Añadir tests de visibilidad (entry cards, filtros, botón nueva entrada)
5. Añadir tests de navegación
6. Añadir tests de filtrado
7. Añadir tests de empty/error states
8. Verificar multi-browser

### Dependencies
- Auth state configurado antes de cualquier test de `/collection`
- API y DB disponibles (para tests E2E reales)

---

**This spec is ready for implementation.** Start with auth state setup, then implement visibility tests.
