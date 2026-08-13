import { test, expect } from '@playwright/test';
import { CollectionPage } from '../../page-objects/CollectionPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { createEntryViaApi } from '../../utils/helpers';

/**
 * Acceptance tests para la colección (RF-1).
 * Cubre estado vacío, listado, filtros, ordenamiento y búsqueda.
 * Requiere autenticación — usa createTestUserAndLogin() vía API.
 */

test.describe('Collection', () => {
  let collectionPage: CollectionPage;

  test('should show empty state and create first entry button when collection is empty', async ({
    page,
  }) => {
    // ARRANGE — usuario nuevo sin entradas
    await createTestUserAndLogin(page);
    collectionPage = new CollectionPage(page);
    await collectionPage.navigate();

    // ASSERT
    await expect(collectionPage.emptyState).toBeVisible();
    await expect(collectionPage.createFirstEntryButton).toBeVisible();
  });

  test('should list entries and show count', async ({ page }) => {
    // ARRANGE — usuario con 2 entradas creadas vía API
    const { token } = await createTestUserAndLogin(page);
    await createEntryViaApi(page, token, { title: 'One Piece', type: 'anime' });
    await createEntryViaApi(page, token, { title: 'Berserk', type: 'manga' });

    collectionPage = new CollectionPage(page);
    await collectionPage.navigate();

    // ASSERT
    await expect(collectionPage.entryCards).toHaveCount(2);
    await expect(collectionPage.entryCount).toHaveText(/2 entradas/);
    await expect(page.getByText('One Piece')).toBeVisible();
    await expect(page.getByText('Berserk')).toBeVisible();
  });

  test('should filter entries by type', async ({ page }) => {
    // ARRANGE
    const { token } = await createTestUserAndLogin(page);
    await createEntryViaApi(page, token, { title: 'One Piece', type: 'anime' });
    await createEntryViaApi(page, token, { title: 'Berserk', type: 'manga' });

    collectionPage = new CollectionPage(page);
    await collectionPage.navigate();

    // ACT — filtrar por Anime
    await collectionPage.filterByType('anime');

    // ASSERT
    await expect(page.getByText('One Piece')).toBeVisible();
    await expect(page.getByText('Berserk')).toHaveCount(0);
    await expect(collectionPage.entryCards).toHaveCount(1);
  });

  test('should sort entries by title A-Z', async ({ page }) => {
    // ARRANGE
    const { token } = await createTestUserAndLogin(page);
    await createEntryViaApi(page, token, { title: 'Zeta Gundam', type: 'anime' });
    await createEntryViaApi(page, token, { title: 'Akira', type: 'anime' });

    collectionPage = new CollectionPage(page);
    await collectionPage.navigate();

    // ACT — ordenar por título A-Z
    await collectionPage.sortBy('Título A-Z');

    // ASSERT — Akira debe aparecer antes que Zeta Gundam (orden de lectura:
    // fila primero, luego columna, por ser un grid responsive).
    await expect(page.getByText('Akira')).toBeVisible();
    await expect(page.getByText('Zeta Gundam')).toBeVisible();
    const akiraBox = await page.getByText('Akira').boundingBox();
    const zetaBox = await page.getByText('Zeta Gundam').boundingBox();
    expect(akiraBox).not.toBeNull();
    expect(zetaBox).not.toBeNull();
    const akiraBeforeZeta =
      akiraBox!.y < zetaBox!.y ||
      (akiraBox!.y === zetaBox!.y && akiraBox!.x < zetaBox!.x);
    expect(akiraBeforeZeta).toBe(true);
  });

  test('should search entries and clear search', async ({ page }) => {
    // ARRANGE
    const { token } = await createTestUserAndLogin(page);
    await createEntryViaApi(page, token, { title: 'One Piece', type: 'anime' });
    await createEntryViaApi(page, token, { title: 'Berserk', type: 'manga' });

    collectionPage = new CollectionPage(page);
    await collectionPage.navigate();

    // ACT — buscar "One"
    await collectionPage.search('One');

    // ASSERT — solo aparece el banner de búsqueda y la entrada coincidente
    await expect(collectionPage.searchResultsBanner).toBeVisible();
    await expect(page.getByText('One Piece')).toBeVisible();
    await expect(page.getByText('Berserk')).toHaveCount(0);

    // ACT — limpiar búsqueda
    await page.getByLabel('Limpiar búsqueda').click();

    // ASSERT — vuelven a verse ambas entradas
    await expect(collectionPage.entryCards).toHaveCount(2);
  });
});
