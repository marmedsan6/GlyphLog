import { test, expect } from '@playwright/test';
import { RecommendationsPage } from '../../page-objects/RecommendationsPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { mockRecommendationsGenerate, mockRecommendations } from '../../fixtures/llm-mocks';

/**
 * Acceptance tests para recomendaciones (RF-6).
 * Mockea la generación del LLM para un flujo determinista.
 */

test.describe('Recommendations', () => {
  test('should generate recommendations and show result cards', async ({ page }) => {
    // ARRANGE — autenticar y mockear la generación
    await createTestUserAndLogin(page);
    await mockRecommendationsGenerate(page);

    const recommendationsPage = new RecommendationsPage(page);
    await recommendationsPage.navigate();

    // ASSERT — página visible
    await expect(recommendationsPage.heading).toBeVisible();

    // ACT — generar recomendaciones
    await recommendationsPage.generate();

    // ASSERT — se muestran las tarjetas de resultado del mock
    for (const rec of mockRecommendations.recommendations) {
      await expect(page.getByText(rec.title)).toBeVisible();
    }
  });
});
