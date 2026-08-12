import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../page-objects/ProfilePage';
import { createTestUserAndLogin } from '../../utils/auth-helper';

/**
 * Smoke tests para la página de perfil.
 * Requiere autenticación — usa createTestUserAndLogin() vía API.
 */

test.describe('Profile Page', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    await createTestUserAndLogin(page);
    profilePage = new ProfilePage(page);
    await profilePage.navigate();
  });

  test('should display profile page with heading', async () => {
    // ASSERT
    await expect(profilePage.heading).toBeVisible();
  });

  test('should display edit profile button', async () => {
    // ASSERT
    await expect(profilePage.editButton).toBeVisible();
  });

  test('should enter edit mode when clicking edit', async () => {
    // ACT
    await profilePage.clickEdit();

    // ASSERT
    await expect(profilePage.saveButton).toBeVisible();
    await expect(profilePage.cancelButton).toBeVisible();
    await expect(profilePage.usernameInput).toBeVisible();
    await expect(profilePage.bioInput).toBeVisible();
  });

  test('should cancel edit without saving changes', async () => {
    // ARRANGE
    await profilePage.clickEdit();

    // ACT
    await profilePage.cancel();

    // ASSERT
    await expect(profilePage.editButton).toBeVisible();
    await expect(profilePage.saveButton).toHaveCount(0);
    await expect(profilePage.cancelButton).toHaveCount(0);
  });
});
