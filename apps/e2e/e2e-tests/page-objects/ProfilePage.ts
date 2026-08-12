import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Página de perfil del usuario (requiere autenticación).
 * Permite ver y editar username, bio, avatar.
 */
export class ProfilePage extends AppLayout {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByRole('heading', { name: 'Mi perfil' });
  }

  get editButton() {
    return this.page.getByRole('button', { name: 'Editar perfil' });
  }

  get usernameDisplay() {
    return this.page.getByText('Nombre de usuario').locator('..').locator('p');
  }

  get bioDisplay() {
    return this.page.getByText('Bio').locator('..').locator('p');
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

  // --- Actions ---

  async navigate() {
    await this.goto('/profile');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickEdit() {
    await this.editButton.click();
  }

  async editUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  async editBio(bio: string) {
    await this.bioInput.fill(bio);
  }

  async save() {
    await this.saveButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}
