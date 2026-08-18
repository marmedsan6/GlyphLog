import { test, expect } from '@playwright/test';
import { EntryDetailPage } from '../../page-objects/EntryDetailPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { createEntryViaApi, updateProgressViaApi } from '../../utils/helpers';

/**
 * Acceptance tests para el historial y reset de progreso (RF-9).
 * Contrato: HUs del GitHub Project #2 — issues #33 (actualización manual),
 * #35 (historial) y la protección de reinicio del entry_service (409 → reset).
 */

test.describe('Historial y reset de progreso', () => {
  test('should not show timeline for entry without history', async ({ page }) => {
    // ARRANGE — entrada recién creada sin eventos de progreso
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, {
      title: 'E2E Sin historial',
      type: 'anime',
      progressTotal: 12,
    });

    const detailPage = new EntryDetailPage(page);
    await detailPage.navigate(entry.id);

    // ASSERT — no hay timeline (has_history=false)
    await expect(detailPage.title).toHaveText(entry.title);
    await expect(detailPage.progressTimelineCard).toHaveCount(0);
  });

  test('should show timeline events after updating progress', async ({ page }) => {
    // ARRANGE — entrada con un evento de progreso creado vía API
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, {
      title: 'E2E Con historial',
      type: 'anime',
      progressTotal: 12,
    });
    await updateProgressViaApi(page, token, entry.id, 3);

    const detailPage = new EntryDetailPage(page);
    await detailPage.navigate(entry.id);

    // ASSERT — el timeline aparece con al menos un evento
    await expect(detailPage.progressTimelineCard).toBeVisible();
    await expect(detailPage.timelineEvents.first()).toBeVisible();
  });

  test('should prompt reset when changing type of entry with history', async ({ page }) => {
    // ARRANGE — entrada anime con historial (progreso 3 de 12)
    const { token } = await createTestUserAndLogin(page);
    const entry = await createEntryViaApi(page, token, {
      title: 'E2E Reset Progress',
      type: 'anime',
      progressTotal: 12,
    });
    await updateProgressViaApi(page, token, entry.id, 3);

    const detailPage = new EntryDetailPage(page);
    await detailPage.navigate(entry.id);

    // ACT — intentar cambiar el tipo a manga (409 → reset)
    await detailPage.changeTypeAndSave('manga');

    // ASSERT — aparece el diálogo de reinicio de progreso
    await expect(detailPage.resetProgressDialog).toBeVisible();
    await expect(detailPage.resetProgressDialog).toContainText('Reiniciar progreso');

    // ACT — confirmar reinicio
    await detailPage.confirmResetButton.click();

    // ASSERT — vuelve al modo lectura con el tipo cambiado a Manga
    await expect(detailPage.title).toHaveText(entry.title);
    await expect(page.getByText(/Manga ·/)).toBeVisible();
  });
});
