/**
 * Utility helpers for GlyphLog E2E tests.
 */
import { Page } from '@playwright/test';

/** Wait for the app to be hydrated (React root mounted) */
export async function waitForApp(page: Page) {
  await page.waitForSelector('#root', { state: 'attached' });
  await page.waitForLoadState('domcontentloaded');
}

/** Generate a unique email for test accounts */
export function generateTestEmail(): string {
  const suffix = Date.now();
  return `e2e-test-${suffix}@glyphlog.test`;
}
