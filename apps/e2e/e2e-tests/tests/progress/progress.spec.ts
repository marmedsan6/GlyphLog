import { test, expect } from '@playwright/test';
import { CreateEntryPage } from '../../page-objects/CreateEntryPage';
import { EntryDetailPage } from '../../page-objects/EntryDetailPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { createEntryViaApi } from '../../utils/helpers';

/**
 * Acceptance tests para el progreso (RF-3).
 * Cubre configurar total al crear y actualizar progreso desde el detalle.
 */

test.describe('Progress', () => {
  test('should configure progress total when creating an entry', async ({ page }) => {
    // ARRANGE — autenticar y navegar a crear entrada
    await createTestUserAndLogin(page);
    const createPage = new CreateEntryPage(page);
    await createPage.navigate();

    const title = `E2E Progress ${Date.now()}`;

    // ACT — crear anime con total de 12 episodios
    await createPage.createEntry({ title, type: 'anime', progressTotal: 12 });

    // ASSERT — redirige a colección con la entrada creada
    await expect(page).toHaveURL('/collection');
    await expect(page.getByText(title)).toBeVisible();
  });

  test('should update progress from detail and show completion prompt', async ({ page }) => {
    // ARRANGE — entrada anime con total 12 y progreso 0
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, {
      title: 'E2E Progress Update',
      type: 'anime',
      progressTotal: 12,
    });

    const detailPage = new EntryDetailPage(page);
    await detailPage.navigate(entry.id);

    // ASSERT — progreso inicial "0 / 12 episodios"
    await expect(detailPage.progressValue).toHaveText(/0 \/ 12 episodios/);

    // ACT — abrir modal y setear progreso a 12
    await detailPage.openUpdateProgress();
    await expect(detailPage.updateProgressDialog).toBeVisible();
    await detailPage.progressValueInput.fill('12');

    // ASSERT — prompt "¿Completar entrada?" visible al alcanzar el total
    await expect(detailPage.completeEntryPrompt).toBeVisible();

    // ACT — confirmar
    await detailPage.saveProgressButton.click();

    // ASSERT — progreso reflejado "12 / 12 episodios"
    await expect(detailPage.progressValue).toHaveText(/12 \/ 12 episodios/);
  });
});
