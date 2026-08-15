import { test, expect } from '@playwright/test';
import { CollectionPage } from '../../page-objects/CollectionPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { createEntriesViaApi } from '../../utils/helpers';

/**
 * Acceptance tests para la paginación de colección (RF-11).
 * Contrato: HUs del GitHub Project #2 — issue #8 (listar entradas) que exige
 * paginación cuando hay más de 15 entradas. Límite por página = 15 (useEntries).
 */

test.describe('Paginación de colección', () => {
  test('should paginate when collection exceeds 15 entries', async ({ page }) => {
    // ARRANGE — 16 entradas (2 páginas: 15 + 1)
    const { token } = await createTestUserAndLogin(page);
    await createEntriesViaApi(page, token, 16, { titlePrefix: 'E2E Page' });

    const collectionPage = new CollectionPage(page);
    await collectionPage.navigate();

    // ASSERT — contador y paginación visibles
    await expect(collectionPage.entryCount).toHaveText(/16 entradas/);
    await expect(collectionPage.pagination).toBeVisible();
    await expect(collectionPage.entryCards).toHaveCount(15);

    // ACT — ir a la página 2
    await collectionPage.nextPageButton.click();

    // ASSERT — solo 1 entrada en la página 2 y URL actualizada
    await expect(page).toHaveURL(/page=2/);
    await expect(collectionPage.entryCards).toHaveCount(1);

    // ACT — volver a la página anterior
    await collectionPage.previousPageButton.click();

    // ASSERT — de nuevo 15 entradas en la página 1
    await expect(page).toHaveURL(/page=1/);
    await expect(collectionPage.entryCards).toHaveCount(15);
  });
});
