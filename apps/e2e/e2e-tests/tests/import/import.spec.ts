import { test, expect } from '@playwright/test';
import { ImportPage } from '../../page-objects/ImportPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { mockImportParse, mockImportExecute } from '../../fixtures/llm-mocks';

/**
 * Acceptance tests para importación de listas (RF-5).
 * Mockea el LLM (parse y execute) para un flujo determinista.
 */

test.describe('Import', () => {
  test('should complete import wizard and redirect to collection', async ({ page }) => {
    // ARRANGE — autenticar y mockear el LLM
    await createTestUserAndLogin(page);
    await mockImportParse(page);
    await mockImportExecute(page);

    const importPage = new ImportPage(page);
    await importPage.navigate();

    // ACT — paso 1: seleccionar fuente y continuar
    await expect(importPage.heading).toBeVisible();
    await importPage.selectSourceMyAnimeList();
    await importPage.continueToPaste();

    // ACT — paso 2: pegar contenido y parsear
    await importPage.pasteContent('Steins;Gate\nFullmetal Alchemist: Brotherhood');
    await importPage.parse();

    // ASSERT — paso 3: preview con las entradas parseadas
    await expect(importPage.previewHeading).toBeVisible();
    await expect(page.getByText('Steins;Gate')).toBeVisible();
    await expect(page.getByText('Fullmetal Alchemist: Brotherhood')).toBeVisible();

    // ACT — confirmar importación
    await importPage.confirmImport();

    // ASSERT — redirige a la colección
    await expect(page).toHaveURL('/collection');
  });
});
