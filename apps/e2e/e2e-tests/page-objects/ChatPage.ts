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
}
