import { test, expect } from '@playwright/test';
import { HomePage } from '../../page-objects/HomePage';

/**
 * Tests del toggle de tema (claro/oscuro) usando HomePage.
 * El tema persiste en el <html> como clase CSS `dark`.
 */

test.describe('Theme Toggle', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate();
  });

  test('should display theme toggle button on home page', async () => {
    await expect(homePage.themeToggle).toBeVisible();
  });

  test('should toggle to dark theme when clicking theme button', async () => {
    await homePage.themeToggle.click();
    await expect(homePage.html).toHaveClass(/dark/);
  });

  test('should toggle back to light theme after two clicks', async () => {
    await homePage.themeToggle.click();
    await homePage.themeToggle.click();
    await expect(homePage.html).not.toHaveClass(/dark/);
  });
});
