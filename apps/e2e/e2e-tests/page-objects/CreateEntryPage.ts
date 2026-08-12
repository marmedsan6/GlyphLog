import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Página de creación de entrada (requiere autenticación).
 * Usa react-hook-form con zod + shadcn/ui Form components.
 */
export class CreateEntryPage extends AppLayout {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByRole('heading', { name: 'Nueva entrada' });
  }

  get titleInput() {
    return this.page.getByRole('textbox', { name: /título/i });
  }

  get typeSelector() {
    return this.page.getByRole('combobox', { name: /tipo/i });
  }

  get statusSelector() {
    return this.page.getByRole('combobox', { name: /estado/i });
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
      game: 'Juego',
    };
    await this.typeSelector.click();
    await this.page.getByRole('option', { name: labels[type] }).click();
  }

  async selectStatus(status: string) {
    const labels: Record<string, string> = {
      watching: 'Viendo',
      completed: 'Completado',
      on_hold: 'En pausa',
      dropped: 'Abandonado',
      plan_to_watch: 'Planeado',
    };
    await this.statusSelector.click();
    await this.page.getByRole('option', { name: labels[status] }).click();
  }

  async submit() {
    await this.submitButton.click();
  }

  async createEntry(opts: {
    title: string;
    type: 'anime' | 'manga' | 'game';
    status?: string;
  }) {
    await this.fillTitle(opts.title);
    await this.selectType(opts.type);
    if (opts.status) {
      await this.selectStatus(opts.status);
    }
    await this.submit();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}
