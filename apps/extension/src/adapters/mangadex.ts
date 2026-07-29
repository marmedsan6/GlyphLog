/**
 * Adaptador para MangaDex — detecta capítulos en el lector (`/chapter/{uuid}`)
 * y extrae el título del manga y número de capítulo.
 *
 * MangaDex es una SPA: el HTML servidor solo devuelve un shell vacío. La
 * detección se ejecuta sobre el DOM renderizado por el cliente. Por eso se
 * usan múltiples fuentes redundantes (DOM > og:title > document.title) y se
 * documenta explícitamente la regla de capítulos decimales.
 */

import { SiteAdapter, DetectedMedia } from './types';

export class MangaDexAdapter implements SiteAdapter {
  // Selectores centrales del lector de MangaDex.
  private readonly SELECTORS = {
    // Enlace al título del manga en el header del lector
    title: 'a.reader--header-manga',
    // Badge con "Ch. 427" o "Oneshot"
    chapterMeta: '.reader--meta.chapter',
  };

  private readonly CHAPTER_UUID_PATTERN = /^\/chapter\/[0-9a-f-]{36,}(?:\/|$)/i;

  matches(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase() === 'mangadex.org' &&
        this.CHAPTER_UUID_PATTERN.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  detect(document: Document, url: string): DetectedMedia | null {
    try {
      const title = this.extractTitle(document);
      if (!title) {
        return null;
      }

      const chapter = this.extractChapterNumber(document);

      return {
        title,
        chapter,
        mediaType: 'manga',
        pageUrl: url,
      };
    } catch (error) {
      // Fallo silencioso: nunca romper la navegación del usuario
      console.debug('[MangaDexAdapter] Detección falló:', error);
      return null;
    }
  }

  private extractTitle(document: Document): string | null {
    // 1. Header del lector: título limpio sin parsing
    const titleLink = document.querySelector(this.SELECTORS.title);
    const titleFromLink = titleLink?.textContent?.trim();
    if (titleFromLink) {
      return titleFromLink;
    }

    // 2. og:title: "{Title} - Ch. N - {Chapter name} - MangaDex"
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle) {
      const cleaned = this.cleanTitleFromOg(ogTitle);
      if (cleaned) return cleaned;
    }

    // 3. document.title: "1 | Chapter N - {Title} - MangaDex"
    if (document.title) {
      const cleaned = this.cleanTitleFromDocumentTitle(document.title);
      if (cleaned) return cleaned;
    }

    return null;
  }

  private extractChapterNumber(document: Document): number {
    // 1. Badge del lector: "Ch. 427" o "Oneshot"
    const chapterMeta = document.querySelector(this.SELECTORS.chapterMeta);
    const chapterText = chapterMeta?.textContent?.trim();
    if (chapterText) {
      const parsed = this.parseChapterNumber(chapterText);
      if (parsed !== undefined) {
        return parsed;
      }
      // Oneshot u otra etiqueta sin número → tratar como capítulo 1
      return 1;
    }

    // 2. og:title: "{Title} - Ch. N - {Chapter name} - MangaDex"
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle) {
      const parsed = this.parseChapterNumber(ogTitle);
      if (parsed !== undefined) {
        return parsed;
      }
    }

    // 3. document.title: "1 | Chapter N - {Title} - MangaDex"
    if (document.title) {
      const parsed = this.parseChapterNumber(document.title);
      if (parsed !== undefined) {
        return parsed;
      }
    }

    // Último recurso: estamos en /chapter/{uuid} pero sin número visible.
    // Tratar como capítulo 1 según decisión del usuario para oneshots.
    return 1;
  }

  /**
   * Extrae el número de capítulo de un texto como "Ch. 427", "Chapter 102.5",
   * "Vol. 1 Ch. 3.6", etc. Devuelve undefined si no encuentra número.
   *
   * Regla para capítulos decimales (tarea #42): Math.floor, es decir,
   * truncar hacia abajo. 102.5 → 102. Esto garantiza que nunca se marque
   * progreso por contenido no terminado.
   */
  private parseChapterNumber(text: string): number | undefined {
    // Buscar "Ch. 102.5" o "Chapter 102.5" (con o sin punto después de Ch)
    const match = text.match(/(?:Ch\.?|Chapter)\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (match && match[1]) {
      return Math.floor(parseFloat(match[1]));
    }
    return undefined;
  }

  private cleanTitleFromOg(ogTitle: string): string | null {
    // Formato: "{Title} - Ch. N - {Chapter name} - MangaDex"
    const withoutSuffix = ogTitle.replace(/\s+-\s+MangaDex\s*$/i, '');
    const parts = withoutSuffix.split(/\s+-\s+/);
    const [titlePart, chapterPart] = parts;
    if (titlePart && chapterPart && /^(Ch\.?|Chapter)\s*[0-9]/i.test(chapterPart)) {
      return titlePart.trim();
    }
    return null;
  }

  private cleanTitleFromDocumentTitle(pageTitle: string): string | null {
    // Formato: "{page} | Chapter N - {Title} - MangaDex"
    const match = pageTitle.match(/\|\s*Chapter\s*[0-9.]+\s+-\s+(.+?)\s+-\s+MangaDex/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }
}
