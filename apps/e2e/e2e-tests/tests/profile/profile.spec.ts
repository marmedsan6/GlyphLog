import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../page-objects/ProfilePage';
import { AppLayout } from '../../page-objects/AppLayout';
import { createTestUserAndLogin } from '../../utils/auth-helper';

/**
 * Acceptance tests para perfil y sesión (RF-4).
 * Cubre guardar username/bio, ver dispositivos y logout.
 */

test.describe('Profile', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    await createTestUserAndLogin(page);
    profilePage = new ProfilePage(page);
    await profilePage.navigate();
  });

  test('should display profile page with heading', async () => {
    await expect(profilePage.heading).toBeVisible();
  });

  test('should display edit profile button', async () => {
    await expect(profilePage.editButton).toBeVisible();
  });

  test('should display device manager section', async () => {
    await expect(profilePage.deviceSection).toBeVisible();
  });

  test('should enter edit mode when clicking edit', async () => {
    await profilePage.clickEdit();

    await expect(profilePage.saveButton).toBeVisible();
    await expect(profilePage.cancelButton).toBeVisible();
    await expect(profilePage.usernameInput).toBeVisible();
    await expect(profilePage.bioInput).toBeVisible();
  });

  test('should cancel edit without saving changes', async () => {
    await profilePage.clickEdit();
    await profilePage.cancel();

    await expect(profilePage.editButton).toBeVisible();
    await expect(profilePage.saveButton).toHaveCount(0);
    await expect(profilePage.cancelButton).toHaveCount(0);
  });

  test('should save username and bio and reflect changes', async ({ page }) => {
    // ARRANGE
    const username = `user_${Date.now()}`;
    const bio = 'Mi bio de prueba';

    // ACT — editar y guardar
    await profilePage.saveUsernameAndBio(username, bio);

    // ASSERT — vuelve al modo lectura y se ven los valores guardados
    await expect(profilePage.editButton).toBeVisible();
    await expect(page.getByText(username)).toBeVisible();
    await expect(page.getByText(bio)).toBeVisible();
  });

  test('should logout and redirect to login', async ({ page }) => {
    // ARRANGE
    const layout = new AppLayout(page);

    // ACT — cerrar sesión desde el menú de perfil
    await layout.clickLogout();

    // ASSERT — redirige a /login
    await expect(page).toHaveURL('/login');
  });
});
