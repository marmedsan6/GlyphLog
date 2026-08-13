import { test, expect } from '@playwright/test';
import { ChatPage } from '../../page-objects/ChatPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { mockChat } from '../../fixtures/llm-mocks';

/**
 * Acceptance tests para GlyphAI chat (RF-7).
 * Mockea el streaming SSE del LLM para un flujo determinista.
 */

test.describe('GlyphAI Chat', () => {
  test('should send message and see assistant response', async ({ page }) => {
    // ARRANGE — autenticar y mockear el stream del chat
    await createTestUserAndLogin(page);
    await mockChat(page);

    const chatPage = new ChatPage(page);
    await chatPage.navigate();

    // ACT — enviar un mensaje
    await chatPage.sendMessage('Hola');

    // ASSERT — el mensaje del usuario es visible
    await expect(page.getByText('Hola')).toBeVisible();

    // ASSERT — la respuesta del asistente (stream mock) es visible
    await expect(page.getByText(/soy GlyphAI, tu asistente/)).toBeVisible();
  });
});
