import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * GlyphLog register page.
 * Email + password registration (also Google OAuth via GoogleLoginButton).
 */
export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByText('Crear cuenta').first();
  }

  get subtitle() {
    return this.page.getByText('Empieza a gestionar tu colección');
  }

  get emailInput() {
    return this.page.getByLabel('Email');
  }

  get passwordInput() {
    return this.page.getByLabel('Contraseña', { exact: true });
  }

  get confirmPasswordInput() {
    return this.page.getByLabel('Confirmar contraseña');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: 'Crear cuenta' });
  }

  get loginLink() {
    return this.page.getByRole('link', { name: 'Inicia sesión' });
  }

  get errorMessage() {
    return this.page.locator('.text-destructive').first();
  }

  get themeToggle() {
    return this.page.getByRole('button', { name: 'Cambiar tema' });
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/register');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async register(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    await this.submit();
  }

  async clickLoginLink() {
    await this.loginLink.click();
  }
}
