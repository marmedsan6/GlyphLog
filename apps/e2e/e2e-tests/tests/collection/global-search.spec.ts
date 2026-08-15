import { test, expect } from '@playwright/test';
import { AppLayout } from '../../page-objects/AppLayout';
import { CollectionPage } from '../../page-objects/CollectionPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { createEntryViaApi } from '../../utils/helpers';

/**
 * Acceptance tests para la búsqueda global del header (RF-10).
 * Contrato: HUs del GitHub Project #2 — issue #21 (barra de búsqueda global).
 */

test.describe('Búsqueda global (header)', () => {
  test('should submit search and navigate to filtered collection', async ({ page }) => {
    // ARRANGE — dos entradas para acotar la búsqueda
    const { token } = await createTestUserAndLogin(page);
    await createEntryViaApi(page, token, { title: 'Neon Genesis Evangelion', type: 'anime' });
    await createEntryViaApi(page, token, { title: 'Cowboy Bebop', type: 'anime' });

    const layout = new AppLayout(page);
    await page.goto('/collection');
    await page.waitForLoadState('domcontentloaded');

    // ACT — escribir en el header y pulsar Enter
    await layout.searchBar.fill('Neon');
    await layout.searchBar.press('Enter');

    // ASSERT — navega a la colección filtrada por la query
    await expect(page).toHaveURL(/\/collection\?search=Neon/);
    await expect(page.getByText('Neon Genesis Evangelion')).toBeVisible();
    await expect(page.getByText('Cowboy Bebop')).toHaveCount(0);
  });

  test('should navigate via "Ver todos los resultados" dropdown', async ({ page }) => {
    // ARRANGE
    const { token } = await createTestUserAndLogin(page);
    await createEntryViaApi(page, token, { title: 'Monster', type: 'anime' });

    const layout = new AppLayout(page);
    await page.goto('/collection');
    await page.waitForLoadState('domcontentloaded');

    // ACT — escribir y esperar el dropdown con el enlace "Ver todos"
    await layout.searchBar.fill('Monster');
    await expect(layout.viewAllResultsButton).toBeVisible();
    await layout.viewAllResultsButton.click();

    // ASSERT — navega a la colección filtrada
    await expect(page).toHaveURL(/\/collection\?search=Monster/);
    await expect(page.getByText('Monster')).toBeVisible();
  });

  test('should clear search from the header', async ({ page }) => {
    // ARRANGE
    const { token } = await createTestUserAndLogin(page);
    await createEntryViaApi(page, token, { title: 'Akira', type: 'anime' });
    await createEntryViaApi(page, token, { title: 'Berserk', type: 'manga' });

    const layout = new AppLayout(page);
    const collectionPage = new CollectionPage(page);
    await page.goto('/collection?search=Akira');
    await page.waitForLoadState('domcontentloaded');

    // ASSERT — filtrado inicial
    await expect(page.getByText('Akira')).toBeVisible();
    await expect(page.getByText('Berserk')).toHaveCount(0);

    // ACT — limpiar búsqueda desde el header (botón ✕)
    await layout.clearSearchButton.click();

    // ASSERT — vuelve a mostrarse la colección completa
    await expect(page).toHaveURL(/\/collection(?!\?search)/);
    await expect(collectionPage.entryCards).toHaveCount(2);
  });
});
