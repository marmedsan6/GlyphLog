import { Page, Locator, expect } from '@playwright/test';

/**
 * Base class for all Page Objects
 * Provides common methods for page interactions
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   * @param path - Path to navigate to (e.g., '/login')
   */
  async goto(path: string = '') {
    await this.page.goto(path);
  }

  /**
   * Click an element by selector
   * @param selector - CSS selector or data-testid
   */
  async click(selector: string) {
    await this.page.locator(selector).click();
  }

  /**
   * Fill an input field
   * @param selector - CSS selector or data-testid
   * @param text - Text to fill
   */
  async fill(selector: string, text: string) {
    await this.page.locator(selector).fill(text);
  }

  /**
   * Type text character by character (slower than fill, but simulates user typing)
   * @param selector - CSS selector or data-testid
   * @param text - Text to type
   */
  async type(selector: string, text: string) {
    await this.page.locator(selector).type(text);
  }

  /**
   * Get text content of an element
   * @param selector - CSS selector or data-testid
   * @returns Text content
   */
  async getText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * Check if element is visible
   * @param selector - CSS selector or data-testid
   * @returns boolean
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Wait for element to be visible
   * @param selector - CSS selector or data-testid
   * @param timeout - Timeout in ms (default 5000)
   */
  async waitForElement(selector: string, timeout: number = 5000) {
    await this.page.locator(selector).waitFor({ timeout });
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
   * Check if element exists in DOM
   * @param selector - CSS selector or data-testid
   * @returns boolean
   */
  async elementExists(selector: string): Promise<boolean> {
    return (await this.page.locator(selector).count()) > 0;
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
