import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * AppLayout — contenedor de todas las páginas protegidas.
 * Incluye header con navegación, search bar, perfil de usuario y contenido.
 */
export class AppLayout extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get logo() {
    return this.page.getByRole('link', { name: 'GlyphLog' });
  }

  get searchBar() {
    return this.page.getByPlaceholder(/buscar/i);
  }

  get navCollection() {
    return this.page.getByRole('link', { name: 'Colección' });
  }

  get navImport() {
    return this.page.getByRole('link', { name: 'Importar' });
  }

  get navRecommendations() {
    return this.page.getByRole('link', { name: 'Recomendaciones' });
  }

  get navChat() {
    return this.page.getByRole('link', { name: 'GlyphAI' });
  }

  get profileMenuButton() {
    return this.page.getByRole('button', { name: 'Menú de perfil' });
  }

  get profileMenuItem() {
    return this.page.getByRole('menuitem', { name: 'Mi perfil' });
  }

  get logoutMenuItem() {
    return this.page.getByRole('menuitem', { name: 'Cerrar sesión' });
  }

  get themeToggle() {
    return this.page.getByRole('button', { name: /cambiar tema|toggle theme/i });
  }

  // --- Actions ---

  async clickProfile() {
    await this.profileMenuButton.click();
  }

  async clickLogout() {
    await this.clickProfile();
    await this.logoutMenuItem.click();
  }

  async search(query: string) {
    await this.searchBar.fill(query);
    await this.searchBar.press('Enter');
  }

  async navigateToCollection() {
    await this.navCollection.click();
  }

  async navigateToImport() {
    await this.navImport.click();
  }
}
