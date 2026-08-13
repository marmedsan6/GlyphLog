import { test, expect } from '@playwright/test';
import { EntryDetailPage } from '../../page-objects/EntryDetailPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { createEntryViaApi } from '../../utils/helpers';

/**
 * Acceptance tests para el detalle de entrada (RF-2).
 * Cubre ver, editar y eliminar una entrada.
 */

test.describe('Entry Detail', () => {
  test('should view entry detail with title', async ({ page }) => {
    // ARRANGE
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, { title: 'Neon Genesis Evangelion', type: 'anime' });

    const detailPage = new EntryDetailPage(page);
    await detailPage.navigate(entry.id);

    // ASSERT
    await expect(detailPage.title).toHaveText('Neon Genesis Evangelion');
    await expect(detailPage.editButton).toBeVisible();
    await expect(detailPage.deleteButton).toBeVisible();
  });

  test('should edit entry title and persist', async ({ page }) => {
    // ARRANGE
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, { title: 'Título original', type: 'anime' });

    const detailPage = new EntryDetailPage(page);
    await detailPage.navigate(entry.id);

    // ACT — editar el título
    await detailPage.editTitle('Título editado');

    // ASSERT — se vuelve al modo lectura con el nuevo título
    await expect(detailPage.title).toHaveText('Título editado');
    await expect(detailPage.editButton).toBeVisible();
  });

  test('should delete entry with confirmation and redirect to collection', async ({ page }) => {
    // ARRANGE
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, { title: 'Entrada a eliminar', type: 'manga' });

    const detailPage = new EntryDetailPage(page);
    await detailPage.navigate(entry.id);

    // ACT — eliminar con confirmación
    await detailPage.openDeleteDialog();
    await expect(detailPage.deleteDialog).toBeVisible();
    await detailPage.confirmDelete();

    // ASSERT — redirige a colección y la entrada ya no está
    await expect(page).toHaveURL('/collection');
    await expect(page.getByText('Entrada a eliminar')).toHaveCount(0);
  });

  test('should keep entry when delete is cancelled', async ({ page }) => {
    // ARRANGE
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, { title: 'Entrada conservada', type: 'game' });

    const detailPage = new EntryDetailPage(page);
    await detailPage.navigate(entry.id);

    // ACT — abrir diálogo y cancelar
    await detailPage.openDeleteDialog();
    await detailPage.cancelDelete();

    // ASSERT — la entrada sigue visible en el detalle
    await expect(detailPage.title).toHaveText('Entrada conservada');
  });
});
