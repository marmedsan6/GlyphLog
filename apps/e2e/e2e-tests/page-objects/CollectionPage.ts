import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Colección del usuario (requiere autenticación).
 * Muestra grid de entradas, filtros, paginación, búsqueda y ordenamiento.
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

  get filterGroup() {
    return this.page.getByRole('group', { name: 'Filtrar por tipo' });
  }

  get sortButton() {
    return this.page.getByRole('button', { name: /ordenar por/i });
  }

  /** Cada EntryCard es un <Link> a /entries/:id (excluye /entries/new). */
  get entryCards() {
    return this.page.locator('a[href^="/entries/"]:not([href="/entries/new"])');
  }

  get emptyState() {
    return this.page.getByText('Aún no tienes entradas en tu colección.');
  }

  get createFirstEntryButton() {
    return this.page.getByRole('link', { name: 'Crear primera entrada' });
  }

  get pagination() {
    return this.page.getByRole('navigation', { name: 'Paginación de colección' });
  }

  get searchResultsBanner() {
    return this.page.getByText(/Resultados de búsqueda para/i);
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/collection');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickNewEntry() {
    await this.newEntryButton.click();
  }

  async filterByType(type: 'all' | 'anime' | 'manga' | 'game') {
    const labels: Record<string, string> = {
      all: 'Todos',
      anime: 'Anime',
      manga: 'Manga',
      game: 'Juego',
    };
    await this.filterGroup.getByRole('button', { name: labels[type], exact: true }).click();
  }

  async sortBy(label: 'Más reciente' | 'Más antiguo' | 'Título A-Z' | 'Título Z-A') {
    await this.sortButton.click();
    await this.page.getByRole('menuitemradio', { name: label }).click();
  }
}
