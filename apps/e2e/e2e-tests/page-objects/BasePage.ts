import { Page, Locator } from '@playwright/test';

/**
 * Base class for all Page Objects
 *
 * Solo expone primitivas de navegación y espera. Las interacciones con
 * elementos concretos viven en getters `Locator` de cada Page Object, para
 * aprovechar el auto-waiting de Playwright (evitar helpers que devuelven
 * booleanos/texto desde selectores string).
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Elemento raíz <html> (útil para verificar el tema oscuro). */
  get html() {
    return this.page.locator('html');
  }

  /**
   * Navigate to a specific path
   * @param path - Path to navigate to (e.g., '/login')
   */
  async goto(path: string = '') {
    await this.page.goto(path);
  }

  /**
   * Get a locator object for more complex interactions
   * @param selector - CSS selector or data-testid
   * @returns Locator object
   */
  getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Wait for URL to match pattern
   * @param urlPattern - URL pattern or regex
   * @param timeout - Timeout in ms
   */
  async waitForURL(urlPattern: string | RegExp, timeout: number = 5000) {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  /**
   * Press a keyboard key
   * @param key - Key to press (e.g., 'Enter', 'Escape')
   */
  async press(key: string) {
    await this.page.press('body', key);
  }

  /**
   * Get the current page URL
   * @returns Current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Reload the page
   */
  async reload() {
    await this.page.reload();
  }

  /**
   * Wait for page load state
   * @param state - 'load' | 'domcontentloaded' | 'networkidle'
   */
  async waitForPageLoad(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load') {
    await this.page.waitForLoadState(state);
  }
}
