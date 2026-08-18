import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../page-objects/ProfilePage';
import { AppLayout } from '../../page-objects/AppLayout';
import { ImportPage } from '../../page-objects/ImportPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { mockImportParse, mockImportExecute } from '../../fixtures/llm-mocks';

/**
 * Acceptance tests para mover Importaciones dentro de Mi perfil (issue #57).
 *
 * Contrato (HU2):
 * - El item "Importar" desaparece del nav del header.
 * - Mi perfil muestra una sección/enlace a la importación.
 * - El flujo de importación sigue funcionando al acceder desde Mi perfil.
 */

test.describe('Importaciones desde Mi perfil', () => {
  test('should remove Importar from header nav and expose it in profile', async ({ page }) => {
    // ARRANGE
    await createTestUserAndLogin(page);

    const layout = new AppLayout(page);
    const profilePage = new ProfilePage(page);
    await profilePage.navigate();

    // ASSERT — el enlace del header ya no existe
    await expect(page.getByRole('link', { name: 'Importar', exact: true })).toHaveCount(0);

    // ASSERT — la sección Importaciones aparece en Mi perfil
    await expect(profilePage.importSectionHeading).toBeVisible();
    await expect(profilePage.importLink).toBeVisible();
  });

  test('should navigate to import flow from profile and complete it', async ({ page }) => {
    // ARRANGE — autenticar y mockear el LLM (parse + execute)
    await createTestUserAndLogin(page);
    await mockImportParse(page);
    await mockImportExecute(page);

    const profilePage = new ProfilePage(page);
    await profilePage.navigate();

    // ACT — acceder a la importación desde Mi perfil
    await profilePage.importLink.click();

    // ASSERT — aterriza en el wizard de importación
    const importPage = new ImportPage(page);
    await expect(page).toHaveURL(/\/import/);
    await expect(importPage.heading).toBeVisible();

    // ACT — completar el wizard (fuente → contenido → preview → confirmar)
    await importPage.selectSourceMyAnimeList();
    await importPage.continueToPaste();
    await importPage.pasteContent('Steins;Gate\nFullmetal Alchemist: Brotherhood');
    await importPage.parse();
    await expect(importPage.previewHeading).toBeVisible();
    await importPage.confirmImport();

    // ASSERT — redirige a la colección
    await expect(page).toHaveURL('/collection');
  });
});
