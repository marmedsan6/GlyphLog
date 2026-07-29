/**
 * GlyphLog Companion — Content Script
 * Inyectado en páginas soportadas (Crunchyroll, AnimeFLV) para detectar media y mostrar overlay.
 *
 * Responsabilidades:
 * 1. Ejecutar detectión cuando la página carga
 * 2. Escuchar cambios de navegación SPA (history.pushState, popstate)
 * 3. Mostrar el overlay cuando se detecta media
 */

import { defineContentScript } from 'wxt/sandbox';
import { detectMediaInPage, getAdapter } from '~/adapters';
import { createAndShowOverlay } from '~/overlay/overlay';

export default defineContentScript({
  // Mismo alcance que host_permissions: sin <all_urls>, un patrón por sitio soportado
  matches: [
    '*://www.crunchyroll.com/*',
    '*://crunchyroll.com/*',
    '*://animeflv.net/*',
    '*://*.animeflv.net/*',
    '*://mangadex.org/*',
  ],
  main() {
    /**
     * Sesión de episodios descartados (URL → descartado en esta sesión)
     * Se reinicia con cada reload de página.
     */
    const dismissedEpisodes = new Set<string>();

    // ─────────────────────────────────────────────────────────────────────────
    // SPA Navigation Detection
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Monkey-patch de history.pushState para detectar navegación SPA
     */
    function setupHistoryListener(): void {
      const originalPushState = history.pushState;

      history.pushState = function (...args: Parameters<History['pushState']>) {
        const result = originalPushState.call(this, args[0], args[1], args[2]);
        // Después de que pushState cambie la URL, intentar detectar media
        setTimeout(() => {
          detectAndShow();
        }, 100); // pequeño delay para que el DOM se actualice
        return result;
      };

      // Escuchar popstate (botón atrás/adelante)
      window.addEventListener('popstate', () => {
        setTimeout(() => {
          detectAndShow();
        }, 100);
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Media Detection & Overlay Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Función principal: detecta media y muestra el overlay si aplica.
     *
     * Para SPAs como MangaDex, el DOM del lector se renderiza de forma
     * asíncrona. Si la URL corresponde a un adaptador conocido y la primera
     * detección falla, reintentamos durante unos segundos antes de rendirnos.
     */
    async function detectAndShow(): Promise<void> {
      // Checar si el URL fue descartado en esta sesión
      const currentUrl = window.location.href;
      if (dismissedEpisodes.has(currentUrl)) {
        console.debug('[GlyphLog] URL descartada en esta sesión:', currentUrl);
        return;
      }

      // Intentar detectar media (con reintentos si hay un adaptador para esta URL)
      const media = await detectMediaWithRetry(currentUrl);

      if (!media) {
        console.debug('[GlyphLog] No se detectó media en:', currentUrl);
        return;
      }

      console.log('[GlyphLog] Media detectado:', media);

      // Emitir evento al background (para logging)
      chrome.runtime.sendMessage(
        {
          type: 'MEDIA_DETECTED',
          data: media,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[GlyphLog] Error enviando mensaje:', chrome.runtime.lastError);
          } else {
            console.debug('[GlyphLog] Mensaje enviado al background');
          }
        }
      );

      // Mostrar el overlay
      await createAndShowOverlay(media);
    }

    /**
     * Detecta media, reintentando cuando la URL tiene un adaptador registrado.
     * MangaDex necesita esperar al renderizado SPA del lector.
     */
    async function detectMediaWithRetry(
      url: string,
      maxAttempts: number = 10,
      delayMs: number = 500
    ): Promise<any | null> {
      const adapter = getAdapter(url);
      const attempts = adapter ? maxAttempts : 1;

      console.debug(`[GlyphLog] Adapter for ${url.substring(0, 60)}: ${adapter ? adapter.constructor.name : 'NONE'}`);
      console.debug(`[GlyphLog] Attempting detection ${attempts} times...`);

      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          const media = await detectMediaInPage();
          if (media) {
            console.log(`[GlyphLog] ✅ Media detected on attempt ${attempt}/${attempts}:`, media);
            return media;
          }
          if (attempt % 2 === 0) {
            console.debug(`[GlyphLog] Attempt ${attempt}/${attempts}: no media yet...`);
          }
        } catch (error) {
          console.error(`[GlyphLog] Error on attempt ${attempt}:`, error);
        }
        if (attempt < attempts) {
          await sleep(delayMs);
        }
      }

      console.warn(`[GlyphLog] ❌ Media detection failed after ${attempts} attempts`);
      return null;
    }

    function sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────

    function init(): void {
      console.log('[GlyphLog] Content script inicializado en:', window.location.href);

      // Configurar listeners de navegación SPA
      setupHistoryListener();

      // Ejecutar detección inicial
      detectAndShow().catch(console.error);
    }

    // Ejecutar al cargar el script
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    // Exponer funciones para debugging (opcional)
    (window as any).__glyphlog = {
      detectAndShow,
    };
  },
});
