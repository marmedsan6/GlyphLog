import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Colección del usuario (requiere autenticación).
 * Muestra grid de entradas, filtros, paginación.
 */
export class CollectionPage extends AppLayout {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByRole('heading', { name: 'Mi Colección' });
  }

  get entryCount() {
    return this.page.getByText(/\d+ (entradas|entrada)/);
  }

  get newEntryButton() {
    return this.page.getByRole('link', { name: /nueva entrada/i });
  }

  get filterButtons() {
    return this.page.locator('[data-testid="entry-filters"] button');
  }

  get sortSelector() {
    return this.page.getByRole('combobox');
  }

  get entryCards() {
    return this.page.locator('[data-testid="entry-card"]');
  }

  get emptyState() {
    return this.page.getByText('Aún no tienes entradas');
  }

  get createFirstEntryButton() {
    return this.page.getByRole('link', { name: 'Crear primera entrada' });
  }

  get pagination() {
    return this.page.locator('[data-testid="entry-pagination"]');
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/collection');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickNewEntry() {
    await this.newEntryButton.click();
  }

  async filterByType(type: 'anime' | 'manga' | 'game') {
    const label = type === 'game' ? 'videojuegos' : type;
    await this.page.getByRole('button', { name: new RegExp(label, 'i') }).click();
  }
}
