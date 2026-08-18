import { test, expect } from '@playwright/test';
import { AppLayout } from '../../page-objects/AppLayout';
import { createTestUserAndLogin } from '../../utils/auth-helper';

/**
 * Acceptance tests para los fixes del header/layout.
 *
 * - El enlace "Recomendaciones" ya no aparece en el nav (integrado en GlyphAI).
 * - El logo muestra solo "GlyphLog" (sin "Journal").
 */

test.describe('Header navigation', () => {
  test('should show only Colección and GlyphAI in nav (no Recomendaciones)', async ({ page }) => {
    // ARRANGE — autenticar y navegar a una página protegida
    await createTestUserAndLogin(page);
    const layout = new AppLayout(page);
    await layout.goto('/collection');
    await page.waitForLoadState('domcontentloaded');

    // ASSERT — los enlaces de navegación visibles son los esperados
    await expect(layout.navCollection).toBeVisible();
    await expect(layout.navChat).toBeVisible();

    // ASSERT — "Recomendaciones" NO aparece como enlace de navegación
    const recommendationsLink = page.getByRole('link', { name: 'Recomendaciones' });
    await expect(recommendationsLink).not.toBeVisible();
  });

  test('should display logo as GlyphLog without Journal', async ({ page }) => {
    // ARRANGE — autenticar y navegar a una página protegida
    await createTestUserAndLogin(page);
    const layout = new AppLayout(page);
    await layout.goto('/collection');
    await page.waitForLoadState('domcontentloaded');

    // ASSERT — el logo muestra "GlyphLog" y NO "Journal"
    await expect(layout.logo).toBeVisible();
    await expect(layout.logo).toHaveText('GlyphLog');

    const journalText = page.getByText('Journal');
    await expect(journalText).not.toBeVisible();
  });
});
