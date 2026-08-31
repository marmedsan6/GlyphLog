/**
 * GlyphLog Companion — Content Script
 * Inyectado en páginas soportadas (Crunchyroll, AnimeFLV) para detectar media y mostrar overlay.
 *
 * Responsabilidades:
 * 1. Ejecutar detectión cuando la página carga
 * 2. Escuchar cambios de navegación SPA
 * 3. Mostrar el overlay cuando se detecta media
 */

import { defineContentScript } from "wxt/sandbox";
import type { ContentScriptContext } from "wxt/client";
import { detectMediaInPage, getAdapter } from "~/adapters";
import { createAndShowOverlay, hideActiveOverlay } from "~/overlay/overlay";

export default defineContentScript({
  // Mismo alcance que host_permissions: sin <all_urls>, un patrón por sitio soportado
  matches: [
    "*://www.crunchyroll.com/*",
    "*://crunchyroll.com/*",
    "*://animeflv.net/*",
    "*://*.animeflv.net/*",
    "*://mangadex.org/*",
  ],
  main(ctx) {
    /**
     * Sesión de episodios descartados (URL → descartado en esta sesión)
     * Se reinicia con cada reload de página.
     */
    const dismissedEpisodes = new Set<string>();

    // ─────────────────────────────────────────────────────────────────────────
    // SPA Navigation Detection
    // ─────────────────────────────────────────────────────────────────────────

    function setupHistoryListener(ctx: ContentScriptContext): void {
      let lastObservedUrl = window.location.href;
      let pendingDetection: number | undefined;
      let hydrationObserver: MutationObserver | undefined;
      let hydrationTimeout: number | undefined;
      let detectionInFlight = false;
      let rerunRequested = false;

      const stopHydrationObservation = (): void => {
        hydrationObserver?.disconnect();
        hydrationObserver = undefined;
        window.clearTimeout(hydrationTimeout);
        hydrationTimeout = undefined;
        window.clearTimeout(pendingDetection);
        pendingDetection = undefined;
        rerunRequested = false;
      };

      const runDetection = async (): Promise<void> => {
        pendingDetection = undefined;
        if (detectionInFlight) {
          rerunRequested = true;
          return;
        }

        detectionInFlight = true;
        try {
          const detected = await detectAndShow();
          if (detected) {
            stopHydrationObservation();
          }
        } finally {
          detectionInFlight = false;
          if (rerunRequested && hydrationObserver) {
            rerunRequested = false;
            pendingDetection = ctx.setTimeout(() => {
              runDetection().catch(console.error);
            }, 100);
          }
        }
      };

      const scheduleDetection = (): void => {
        if (pendingDetection !== undefined) {
          return;
        }
        pendingDetection = ctx.setTimeout(() => {
          runDetection().catch(console.error);
        }, 100);
      };

      const observeHydration = (url: string): void => {
        stopHydrationObservation();
        if (!getAdapter(url)) {
          return;
        }

        hydrationObserver = new MutationObserver(scheduleDetection);
        // Crunchyroll puede sustituir el shell <html> durante una navegación
        // blanda. El Document sobrevive a ese reemplazo; observar el elemento
        // anterior dejaría el detector conectado a un árbol ya descartado.
        hydrationObserver.observe(document, {
          attributes: true,
          attributeFilter: ["content"],
          childList: true,
          subtree: true,
        });
        hydrationTimeout = ctx.setTimeout(stopHydrationObservation, 30_000);
        scheduleDetection();
      };

      const detectNavigation = (): void => {
        const nextUrl = window.location.href;
        if (nextUrl === lastObservedUrl) {
          return;
        }
        lastObservedUrl = nextUrl;
        observeHydration(nextUrl);
      };

      // WXT mantiene un watcher de history API en el contexto del content
      // script. A diferencia de parchear pushState desde el mundo aislado,
      // este evento también cubre las navegaciones iniciadas por el shell SPA
      // de Crunchyroll.
      ctx.addEventListener(window, "wxt:locationchange", detectNavigation);
      ctx.addEventListener(window, "popstate", detectNavigation);
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
    async function detectAndShow(): Promise<boolean> {
      // Checar si el URL fue descartado en esta sesión
      const currentUrl = window.location.href;
      if (dismissedEpisodes.has(currentUrl)) {
        console.debug("[GlyphLog] URL descartada en esta sesión:", currentUrl);
        return true;
      }

      // Intentar detectar media (con reintentos si hay un adaptador para esta URL)
      const media = await detectMediaWithRetry(currentUrl);

      // La SPA puede cambiar de ruta mientras los reintentos esperan la
      // hidratación. No mostramos datos de una ruta antigua sobre la nueva.
      if (window.location.href !== currentUrl) {
        return false;
      }

      if (!media) {
        hideActiveOverlay();
        console.debug("[GlyphLog] No se detectó media en:", currentUrl);
        return false;
      }

      console.log("[GlyphLog] Media detectado:", media);

      // Emitir evento al background (para logging)
      chrome.runtime.sendMessage(
        {
          type: "MEDIA_DETECTED",
          data: media,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "[GlyphLog] Error enviando mensaje:",
              chrome.runtime.lastError,
            );
          } else {
            console.debug("[GlyphLog] Mensaje enviado al background");
          }
        },
      );

      // Mostrar el overlay
      await createAndShowOverlay(media);
      return true;
    }

    /**
     * Detecta media, reintentando cuando la URL tiene un adaptador registrado.
     * MangaDex necesita esperar al renderizado SPA del lector.
     */
    async function detectMediaWithRetry(
      url: string,
      maxAttempts: number = 10,
      delayMs: number = 500,
    ): Promise<any | null> {
      const adapter = getAdapter(url);
      const attempts = adapter ? maxAttempts : 1;

      console.debug(
        `[GlyphLog] Adapter for ${url.substring(0, 60)}: ${adapter ? adapter.constructor.name : "NONE"}`,
      );
      console.debug(`[GlyphLog] Attempting detection ${attempts} times...`);

      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          const media = await detectMediaInPage();
          if (media) {
            console.log(
              `[GlyphLog] ✅ Media detected on attempt ${attempt}/${attempts}:`,
              media,
            );
            return media;
          }
          if (attempt % 2 === 0) {
            console.debug(
              `[GlyphLog] Attempt ${attempt}/${attempts}: no media yet...`,
            );
          }
        } catch (error) {
          console.error(`[GlyphLog] Error on attempt ${attempt}:`, error);
        }
        if (attempt < attempts) {
          await sleep(delayMs);
        }
      }

      console.warn(
        `[GlyphLog] ❌ Media detection failed after ${attempts} attempts`,
      );
      return null;
    }

    function sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────

    function init(ctx: ContentScriptContext): void {
      console.log(
        "[GlyphLog] Content script inicializado en:",
        window.location.href,
      );

      // Configurar listeners de navegación SPA
      setupHistoryListener(ctx);

      // Ejecutar detección inicial
      detectAndShow().catch(console.error);
    }

    // Ejecutar al cargar el script
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => init(ctx));
    } else {
      init(ctx);
    }

    // Exponer funciones para debugging (opcional)
    (window as any).__glyphlog = {
      detectAndShow,
    };
  },
});
