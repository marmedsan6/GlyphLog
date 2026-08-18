import { test, expect } from '@playwright/test';
import { ChatPage } from '../../page-objects/ChatPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { mockYoutubeDiscoveryEndpoint } from '../../fixtures/llm-mocks';

/**
 * Acceptance tests para el Descubrimiento de YouTube en GlyphAI Chat.
 *
 * Sigue las buenas prácticas del proyecto:
 * - Page Object Model (`ChatPage`)
 * - Autenticación real con usuario único (`createTestUserAndLogin`)
 * - Mock determinista del endpoint LLM con `page.route`
 * - Verificación de flujos estables, envío, renderizado de sugerencias y errores informativos.
 */

test.describe('YouTube Discovery en GlyphAI', () => {
  test('debe abrir el diálogo desde el menú de funciones y mantenerlo estable al escribir la URL', async ({ page }) => {
    // ARRANGE — autenticar y navegar al chat
    await createTestUserAndLogin(page);
    const chatPage = new ChatPage(page);
    await chatPage.navigate();

    // ACT — abrir el menú de funciones y seleccionar Descubrimiento YouTube
    await chatPage.openYoutubeDialog();

    // ASSERT — el dialog se abre y muestra el campo de URLs
    await expect(chatPage.youtubeDialog).toBeVisible();
    await expect(chatPage.youtubeUrlsInput).toBeVisible();

    // ACT — escribir la URL del canal iLuTV
    await chatPage.fillYoutubeUrls('https://www.youtube.com/@iLuTV');

    // ASSERT — el dialog permanece abierto tras interactuar con el input
    await expect(chatPage.youtubeDialog).toBeVisible();
    await expect(chatPage.youtubeUrlsInput).toHaveValue('https://www.youtube.com/@iLuTV');

    // ASSERT — el botón Analizar está habilitado con la URL
    await expect(chatPage.youtubeAnalyzeButton).toBeEnabled();
  });

  test('debe enviar la URL de @iLuTV, cerrar el diálogo y renderizar las sugerencias en el chat', async ({ page }) => {
    // ARRANGE — autenticar, mockear endpoint de descubrimiento y navegar al chat
    await createTestUserAndLogin(page);
    await mockYoutubeDiscoveryEndpoint(page);

    const chatPage = new ChatPage(page);
    await chatPage.navigate();

    // ACT — abrir el dialog y rellenar la URL de iLuTV
    await chatPage.openYoutubeDialog();
    await chatPage.fillYoutubeUrls('https://www.youtube.com/@iLuTV');

    // ACT — enviar el formulario de análisis
    await chatPage.submitYoutubeAnalysis();

    // ASSERT — el diálogo se cierra tras el envío
    await expect(chatPage.youtubeDialog).not.toBeVisible();

    // ASSERT — el turno del usuario y las sugerencias del asistente son visibles
    await expect(page.getByText('https://www.youtube.com/@iLuTV')).toBeVisible();
    await expect(page.getByText('Neon Genesis Evangelion', { exact: true })).toBeVisible();
    await expect(page.getByText('Chainsaw Man', { exact: true })).toBeVisible();
    await expect(page.getByText('iLuTV').first()).toBeVisible();
  });

  test('debe mostrar display de carga mientras analiza y permitir continuar la conversación', async ({ page }) => {
    // ARRANGE — autenticar, mockear stream de chat y retrasar respuesta de youtube
    await createTestUserAndLogin(page);

    await page.route('**/api/v1/ai/youtube', async (route) => {
      // Simular tiempo de análisis
      await page.waitForTimeout(300);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          conversation_id: 'conv-yt-e2e',
          suggestions: [
            {
              title: 'Neon Genesis Evangelion',
              type: 'anime',
              mentioned_by: 'iLuTV',
              video_title: 'Análisis Evangelion',
              video_url: 'https://www.youtube.com/watch?v=1',
              opinion: 'positive',
              rating: 10,
              timestamp: '1:00',
              in_collection: false,
              external_url: null,
              cover_image_url: null,
            },
          ],
          metadata: {
            channels_analyzed: 1,
            videos_analyzed: 20,
            titles_found: 1,
            new_suggestions: 1,
            tokens_used: 0,
            analyzed_at: '2026-08-18T12:00:00Z',
          },
        }),
      });
    });

    await page.route('**/api/v1/ai/chat', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [
          'data: {"conversation_id":"conv-yt-e2e"}',
          '',
          'data: {"delta":"¡Evangelion es genial!"}',
          '',
          'data: [DONE]',
          '',
          '',
        ].join('\n'),
      })
    );

    const chatPage = new ChatPage(page);
    await chatPage.navigate();

    // ACT — abrir dialog y enviar
    await chatPage.openYoutubeDialog();
    await chatPage.fillYoutubeUrls('https://www.youtube.com/@iLuTV');
    await chatPage.submitYoutubeAnalysis();

    // ASSERT — el display de carga es visible mientras analiza
    await expect(page.getByText('Analizando canales de YouTube…')).toBeVisible();

    // ASSERT — tras resolverse, aparecen las sugerencias
    await expect(page.getByText('Neon Genesis Evangelion', { exact: true })).toBeVisible();

    // ACT — enviar un mensaje de seguimiento en el chat
    await chatPage.sendMessage('Cuéntame más sobre Evangelion');

    // ASSERT — el nuevo mensaje y la respuesta del asistente se muestran
    await expect(page.getByText('Cuéntame más sobre Evangelion')).toBeVisible();
    await expect(page.getByText('¡Evangelion es genial!')).toBeVisible();
  });

  test('debe mostrar mensaje de error descriptivo inline si falla la API de YouTube o falta configuración', async ({ page }) => {
    // ARRANGE — autenticar y simular 503 con detail descriptivo
    await createTestUserAndLogin(page);
    await page.route('**/api/v1/ai/youtube', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          detail:
            'YouTube discovery no está disponible en este momento. Configure YOUTUBE_API_KEY para habilitar esta funcionalidad.',
        }),
      })
    );

    const chatPage = new ChatPage(page);
    await chatPage.navigate();

    // ACT — abrir dialog y enviar
    await chatPage.openYoutubeDialog();
    await chatPage.fillYoutubeUrls('https://www.youtube.com/@iLuTV');
    await chatPage.submitYoutubeAnalysis();

    // ASSERT — el diálogo se cierra y se muestra el mensaje de error inline
    await expect(chatPage.youtubeDialog).not.toBeVisible();
    await expect(
      page.getByText(/YouTube discovery no está disponible en este momento/)
    ).toBeVisible();
  });
});
