import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Página de detalle de entrada /entries/:id (requiere autenticación).
 * Permite ver, editar y eliminar la entrada, y actualizar el progreso.
 */
export class EntryDetailPage extends AppLayout {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  /** Título de la entrada en modo lectura (h1 dentro de la vista de detalle). */
  get title() {
    return this.page.getByRole('heading', { level: 1 });
  }

  get editButton() {
    return this.page.getByTestId('edit-button');
  }

  get deleteButton() {
    return this.page.getByTestId('delete-button');
  }

  get updateProgressButton() {
    return this.page.getByTestId('update-progress-button');
  }

  get progressValue() {
    // El valor de progreso en modo lectura vive en el card de detalle.
    // El modal de actualización también muestra el progreso, así que acotamos.
    return this.page.locator('p.text-sm.font-medium', {
      hasText: /\d+ \/ \d+ (episodios|capítulos|horas)/,
    }).first();
  }

  get backButton() {
    return this.page.getByRole('button', { name: 'Volver' });
  }

  // Modal de actualización de progreso (UpdateProgressModal)
  get updateProgressDialog() {
    return this.page.getByRole('alertdialog', { name: 'Actualizar progreso' });
  }

  get progressValueInput() {
    return this.updateProgressDialog.locator('#progress-value');
  }

  get saveProgressButton() {
    return this.updateProgressDialog.getByRole('button', { name: 'Guardar progreso' });
  }

  get completeEntryPrompt() {
    return this.updateProgressDialog.getByText('¿Completar entrada?');
  }

  // Diálogo de confirmación de eliminación
  get deleteDialog() {
    return this.page.getByRole('alertdialog');
  }

  get confirmDeleteButton() {
    return this.deleteDialog.getByRole('button', { name: 'Eliminar' });
  }

  get cancelDeleteButton() {
    return this.deleteDialog.getByRole('button', { name: 'Cancelar' });
  }

  // Historial de progreso (ProgressTimeline)
  get progressTimelineCard() {
    return this.page.getByTestId('progress-timeline-card');
  }

  get timelineEvents() {
    return this.page.locator('[data-testid^="timeline-event-"]');
  }

  // Modal de reinicio de progreso (ResetProgressModal)
  get resetProgressDialog() {
    return this.page.getByRole('alertdialog', { name: 'Reiniciar progreso' });
  }

  get confirmResetButton() {
    return this.resetProgressDialog.getByRole('button', { name: 'Reiniciar y guardar' });
  }

  get cancelResetButton() {
    return this.resetProgressDialog.getByRole('button', { name: 'Cancelar' });
  }

  get resetReasonInput() {
    return this.resetProgressDialog.locator('#reset-reason');
  }

  // Formulario de edición
  get editFormTitle() {
    return this.page.getByRole('heading', { name: 'Editar entrada' });
  }

  get titleInput() {
    return this.page.getByLabel('Título');
  }

  get saveChangesButton() {
    return this.page.getByRole('button', { name: 'Guardar cambios' });
  }

  /** Selector nativo de tipo del formulario de edición (id="type"). */
  get editTypeSelector() {
    return this.page.locator('#type');
  }

  // --- Actions ---

  async navigate(entryId: string) {
    await this.goto(`/entries/${entryId}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickEdit() {
    await this.editButton.click();
  }

  async editTitle(newTitle: string) {
    await this.clickEdit();
    await this.titleInput.fill(newTitle);
    await this.saveChangesButton.click();
  }

  async openUpdateProgress() {
    await this.updateProgressButton.click();
  }

  async openDeleteDialog() {
    await this.deleteButton.click();
  }

  async confirmDelete() {
    await this.confirmDeleteButton.click();
  }

  async cancelDelete() {
    await this.cancelDeleteButton.click();
  }

  /** Cambia el tipo en el formulario de edición y guarda (sin cambiar título). */
  async changeTypeAndSave(type: 'anime' | 'manga' | 'game') {
    const labels: Record<string, string> = {
      anime: 'Anime',
      manga: 'Manga',
      game: 'Videojuego',
    };
    await this.clickEdit();
    await this.editTypeSelector.selectOption({ label: labels[type] });
    await this.saveChangesButton.click();
  }
}
