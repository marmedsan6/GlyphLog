import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Página de perfil del usuario (requiere autenticación).
 * Permite ver y editar username, bio, avatar y gestionar dispositivos.
 */
export class ProfilePage extends AppLayout {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByText('Mi perfil', { exact: true });
  }

  get editButton() {
    return this.page.getByRole('button', { name: 'Editar perfil' });
  }

  get usernameInput() {
    return this.page.getByLabel('Nombre de usuario');
  }

  get bioInput() {
    return this.page.getByLabel('Bio');
  }

  get saveButton() {
    return this.page.getByRole('button', { name: 'Guardar cambios' });
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: 'Cancelar' });
  }

  get deviceSection() {
    return this.page.getByText('Dispositivos emparejados', { exact: true });
  }

  get importSectionHeading() {
    return this.page.getByText('Importaciones', { exact: true });
  }

  get importLink() {
    return this.page.getByRole('link', { name: 'Importar entradas' });
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/profile');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickEdit() {
    await this.editButton.click();
  }

  async saveUsernameAndBio(username: string, bio: string) {
    await this.clickEdit();
    await this.usernameInput.fill(username);
    await this.bioInput.fill(bio);
    await this.saveButton.click();
  }

  async save() {
    await this.saveButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}
