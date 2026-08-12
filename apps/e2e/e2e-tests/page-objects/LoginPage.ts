import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * GlyphLog login page.
 * Soporta email/password + Google OAuth.
 */
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByText('Iniciar sesión').first();
  }

  get subtitle() {
    return this.page.getByText('Accede a tu colección');
  }

  get emailInput() {
    return this.page.getByLabel('Email');
  }

  get passwordInput() {
    return this.page.getByLabel('Contraseña');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /iniciar sesión/i });
  }

  get googleLoginButton() {
    return this.page.locator('[data-testid="google-login-button"]');
  }

  get registerLink() {
    return this.page.getByRole('link', { name: 'Regístrate' });
  }

  get forgotPasswordButton() {
    return this.page.getByRole('button', { name: /olvidaste tu contraseña/i });
  }

  get errorMessage() {
    return this.page.locator('.text-destructive').first();
  }

  get sessionExpiredBanner() {
    return this.page.getByText('Tu sesión expiró');
  }

  get themeToggle() {
    return this.page.getByRole('button', { name: /cambiar tema|toggle theme/i });
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async clickRegister() {
    await this.registerLink.click();
  }

  async clickForgotPassword() {
    await this.forgotPasswordButton.click();
  }
}
