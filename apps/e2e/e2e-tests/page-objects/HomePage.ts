import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * GlyphLog landing page (pública).
 * Redirige a /collection si el usuario ya está autenticado.
 */
export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByRole('heading', { name: 'GlyphLog' });
  }

  get subtitle() {
    return this.page.getByText('Registra, organiza y sigue tu colección');
  }

  get loginLink() {
    return this.page.getByRole('link', { name: 'Iniciar sesión' });
  }

  get registerLink() {
    return this.page.getByRole('link', { name: 'Registrarse' });
  }

  get themeToggle() {
    return this.page.getByRole('button', { name: /cambiar tema|toggle theme/i });
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickLogin() {
    await this.loginLink.click();
  }

  async clickRegister() {
    await this.registerLink.click();
  }
}
