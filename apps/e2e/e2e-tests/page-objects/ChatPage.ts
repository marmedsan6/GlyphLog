import { Page } from '@playwright/test';
import { AppLayout } from './AppLayout';

/**
 * Página de GlyphAI /chat (requiere autenticación).
 * Chat con historial persistente y streaming de respuestas.
 */
export class ChatPage extends AppLayout {
  constructor(page: Page) {
    super(page);
  }

  // --- Locator Getters ---

  get input() {
    return this.page.getByLabel('Mensaje para GlyphAI');
  }

  get sendButton() {
    return this.page.getByLabel('Enviar mensaje');
  }

  get functionsButton() {
    return this.page.getByLabel('Abrir funciones');
  }

  get youtubeMenuItem() {
    return this.page.getByRole('menuitem', { name: 'Descubrimiento YouTube' });
  }

  get youtubeDialog() {
    return this.page.getByRole('dialog', { name: 'Canales de YouTube' });
  }

  get youtubeUrlsInput() {
    return this.page.getByLabel('URLs de canales de YouTube');
  }

  get youtubeAnalyzeButton() {
    return this.getByRoleInDialog('button', { name: 'Analizar' });
  }

  // --- Actions ---

  async navigate() {
    await this.goto('/chat');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async sendMessage(text: string) {
    await this.input.fill(text);
    // Enter envía (el botón flotante de chat puede solapar al botón de enviar).
    await this.input.press('Enter');
  }

  async openYoutubeDialog() {
    await this.functionsButton.click();
    await this.youtubeMenuItem.click();
  }

  async fillYoutubeUrls(urls: string) {
    await this.youtubeUrlsInput.fill(urls);
  }

  async submitYoutubeAnalysis() {
    await this.youtubeAnalyzeButton.click();
  }

  // --- Helpers ---

  private getByRoleInDialog(role: string, options: { name: string }) {
    return this.youtubeDialog.getByRole(role as 'button', options);
  }
}
