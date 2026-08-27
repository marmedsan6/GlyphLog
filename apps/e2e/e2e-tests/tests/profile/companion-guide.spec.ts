import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../page-objects/ProfilePage';
import { createTestUserAndLogin } from '../../utils/auth-helper';

test.describe('Companion guide', () => {
  test('shows install guide and unsupported browsers in profile', async ({ page }) => {
    await createTestUserAndLogin(page);
    const profilePage = new ProfilePage(page);
    await profilePage.navigate();

    await expect(profilePage.deviceSection).toBeVisible();
    await expect(page.getByText('Guía de Companion')).toBeVisible();
    await expect(page.getByText(/Firefox y Safari no están soportados/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /descargar extensión/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /añadir a chrome/i })).toHaveCount(0);
    await expect(page.getByText(/Nunca copies el JWT/i)).toBeVisible();
  });
});
