import { test, expect } from '@playwright/test';
import { HomePage } from '../../page-objects/HomePage';

test.describe('Home Page', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate();
  });

  test('should display GlyphLog heading on page load', async () => {
    await expect(homePage.heading).toBeVisible();
  });

  test('should display the subtitle', async () => {
    await expect(homePage.subtitle).toBeVisible();
  });

  test('should display login link', async () => {
    await expect(homePage.loginLink).toBeVisible();
  });

  test('should display register link', async () => {
    await expect(homePage.registerLink).toBeVisible();
  });

  test('should navigate to login when clicking Iniciar sesión', async ({ page }) => {
    await homePage.clickLogin();
    await expect(page).toHaveURL('/login');
  });

  test('should navigate to register when clicking Registrarse', async ({ page }) => {
    await homePage.clickRegister();
    await expect(page).toHaveURL('/register');
  });
});
