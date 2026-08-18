import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Página de creación de entrada (requiere autenticación).
 * Usa react-hook-form con zod. Los campos de tipo y estado son <select> nativos.
 */
export class CreateEntryPage extends AppLayout {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByText('Nueva entrada', { exact: true });
  }

  get titleInput() {
    return this.page.getByLabel('Título');
  }

  /** Los <select> nativos usan id={field.name}, no el htmlFor del FormLabel. */
  get typeSelector() {
    return this.page.locator('#type');
  }

  /** Selector de categoría del buscador inteligente de catálogo. */
  get externalSearchTypeSelector() {
    return this.page.getByLabel('Categoría de búsqueda');
  }

  get externalSearchInput() {
    return this.page.getByPlaceholder(/Buscar título en AniList \/ IGDB/);
  }

  get statusSelector() {
    return this.page.locator('#status');
  }

  get progressTotalInput() {
    return this.page.getByLabel('Total esperado (opcional)');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: 'Crear entrada' });
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: 'Cancelar' });
  }

  get errorMessage() {
    return this.page.locator('.text-destructive').first();
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/entries/new');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async selectType(type: 'anime' | 'manga' | 'game') {
    const labels: Record<string, string> = {
      anime: 'Anime',
      manga: 'Manga',
      game: 'Videojuego',
    };
    await this.typeSelector.selectOption({ label: labels[type] });
  }

  async selectStatus(status: string) {
    await this.statusSelector.selectOption(status);
  }

  async fillProgressTotal(total: number) {
    await this.progressTotalInput.fill(String(total));
  }

  async submit() {
    await this.submitButton.click();
  }

  async createEntry(opts: {
    title: string;
    type: 'anime' | 'manga' | 'game';
    status?: string;
    progressTotal?: number;
  }) {
    await this.fillTitle(opts.title);
    await this.selectType(opts.type);
    if (opts.status) {
      await this.selectStatus(opts.status);
    }
    if (opts.progressTotal != null) {
      await this.fillProgressTotal(opts.progressTotal);
    }
    await this.submit();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}
