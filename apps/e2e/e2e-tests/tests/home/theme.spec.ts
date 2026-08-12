import { test, expect, type Page } from '@playwright/test';

class ThemeToggle {
  readonly button;
  readonly html;

  constructor(page: Page) {
    this.button = page.getByRole('button', { name: 'Cambiar tema' });
    this.html = page.locator('html');
  }
}

test.describe('Theme Toggle', () => {
  test('should display theme toggle button on home page', async ({ page }) => {
    const theme = new ThemeToggle(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(theme.button).toBeVisible();
  });

  test('should toggle to dark theme when clicking theme button', async ({ page }) => {
    const theme = new ThemeToggle(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await theme.button.click();
    await expect(theme.html).toHaveClass(/dark/);
  });

  test('should toggle back to light theme after two clicks', async ({ page }) => {
    const theme = new ThemeToggle(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await theme.button.click();
    await theme.button.click();
    await expect(theme.html).not.toHaveClass(/dark/);
  });
});
