import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Página de recomendaciones personalizadas (requiere autenticación).
 * Genera recomendaciones con Claude y muestra tarjetas de resultado.
 */
export class RecommendationsPage extends AppLayout {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByRole('heading', { name: 'Recomendaciones personalizadas' });
  }

  get generateButton() {
    return this.page.getByRole('button', { name: 'Generar recomendaciones' });
  }

  get recommendationCards() {
    return this.page.locator('.grid .bg-card');
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/recommendations');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async generate() {
    await this.generateButton.click();
  }
}
