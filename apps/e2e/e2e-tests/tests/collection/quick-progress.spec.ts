import { test, expect } from '@playwright/test';
import { CollectionPage } from '../../page-objects/CollectionPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { createEntryViaApi } from '../../utils/helpers';

/**
 * Acceptance tests para quick progress desde la tarjeta de colección (RF-8).
 * Cubre el botón rápido (+1 ep), el editor inline y la validación de límites.
 * Contrato: HUs del GitHub Project #2 — issues #34 (acciones rápidas) y #39
 * (edición inline desde EntryCard).
 */

test.describe('Quick progress desde tarjeta', () => {
  test('should increment progress with quick button without reloading', async ({ page }) => {
    // ARRANGE — anime con total 12 y progreso 0
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, {
      title: 'E2E Quick Plus',
      type: 'anime',
      progressTotal: 12,
    });

    const collectionPage = new CollectionPage(page);
    await collectionPage.navigate();
    const card = collectionPage.entryCard(entry.title);

    // ASSERT — progreso inicial "0 / 12"
    await expect(card.inlineEditorButton).toHaveAttribute(
      'aria-label',
      new RegExp(`Editar progreso de ${entry.title}: 0 / 12`)
    );

    // ACT — incrementar un episodio
    await card.quickProgressButton.click();

    // ASSERT — la card refleja "1 / 12" sin recargar
    await expect(card.inlineEditorButton).toHaveAttribute(
      'aria-label',
      new RegExp(`Editar progreso de ${entry.title}: 1 / 12`)
    );
  });

  test('should prompt for completion when quick button reaches the total', async ({ page }) => {
    // ARRANGE — anime con total 1: el botón rápido alcanza el total en un click
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, {
      title: 'E2E Quick Complete',
      type: 'anime',
      progressTotal: 1,
    });

    const collectionPage = new CollectionPage(page);
    await collectionPage.navigate();
    const card = collectionPage.entryCard(entry.title);

    // ACT — click en el botón rápido (reachesTotal → confirmación)
    await card.quickProgressButton.click();

    // ASSERT — aparece el diálogo de completado
    const dialog = page.getByRole('alertdialog', { name: '¿Completar entrada?' });
    await expect(dialog).toBeVisible();

    // ACT — confirmar completado
    await dialog.getByRole('button', { name: 'Marcar como completada' }).click();

    // ASSERT — la card pasa a estado "Completado"
    await expect(card.card.getByText('Completado')).toBeVisible();
  });

  test('should edit progress inline and persist the value', async ({ page }) => {
    // ARRANGE — anime con total 12
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, {
      title: 'E2E Inline Edit',
      type: 'anime',
      progressTotal: 12,
    });

    const collectionPage = new CollectionPage(page);
    await collectionPage.navigate();
    const card = collectionPage.entryCard(entry.title);

    // ACT — entrar en modo edición inline y escribir un valor
    await card.inlineEditorButton.click();
    await card.inlineProgressInput.fill('5');
    await card.inlineProgressInput.press('Enter');

    // ASSERT — el valor se persiste en la card
    await expect(card.inlineEditorButton).toHaveAttribute(
      'aria-label',
      new RegExp(`Editar progreso de ${entry.title}: 5 / 12`)
    );
  });

  test('should reject inline value greater than total', async ({ page }) => {
    // ARRANGE — anime con total 12
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, {
      title: 'E2E Inline Invalid',
      type: 'anime',
      progressTotal: 12,
    });

    const collectionPage = new CollectionPage(page);
    await collectionPage.navigate();
    const card = collectionPage.entryCard(entry.title);

    // ACT — escribir un valor mayor al total
    await card.inlineEditorButton.click();
    await card.inlineProgressInput.fill('15');
    await card.inlineProgressInput.press('Enter');

    // ASSERT — mensaje de validación inline
    await expect(card.card.getByText('El valor no puede superar 12')).toBeVisible();
  });
});
