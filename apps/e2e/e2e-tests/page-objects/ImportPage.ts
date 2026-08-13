import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Página de importación de listas (requiere autenticación).
 * Wizard de 3 pasos: fuente → contenido → preview/confirmación.
 */
export class ImportPage extends AppLayout {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get heading() {
    return this.page.getByRole('heading', { name: 'Importar lista' });
  }

  get sourceCardMyAnimeList() {
    return this.page.getByText('MyAnimeList', { exact: true });
  }

  get sourceCardText() {
    return this.page.getByText('Texto libre');
  }

  get continueButton() {
    return this.page.getByRole('button', { name: 'Continuar' });
  }

  get contentTextarea() {
    return this.page.locator('#content');
  }

  get parseButton() {
    return this.page.getByRole('button', { name: 'Parsear lista' });
  }

  get backButton() {
    return this.page.getByRole('button', { name: 'Atrás' });
  }

  get previewHeading() {
    return this.page.getByText('Paso 3: Revisa y confirma', { exact: true });
  }

  get importButton() {
    return this.page.getByRole('button', { name: /Importar \d+ entrada/ });
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/import');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async selectSourceMyAnimeList() {
    await this.sourceCardMyAnimeList.click();
  }

  async continueToPaste() {
    await this.continueButton.click();
  }

  async pasteContent(content: string) {
    await this.contentTextarea.fill(content);
  }

  async parse() {
    await this.parseButton.click();
  }

  async confirmImport() {
    await this.importButton.click();
  }
}
