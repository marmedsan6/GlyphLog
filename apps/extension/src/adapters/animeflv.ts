/**
 * Adaptador para AnimeFLV — detecta episodios en páginas /ver/...
 * y extrae el título del anime y número de episodio.
 *
 * AnimeFLV rota de subdominio con frecuencia (www3, www4, ...) y su DOM
 * es menos estable que el de Crunchyroll, por eso la detección usa el
 * patrón de URL como señal principal y el DOM como confirmación.
 */

import { SiteAdapter, DetectedMedia } from './types';

export class AnimeFlvAdapter implements SiteAdapter {
  // Selectores centralizados: si AnimeFLV cambia su DOM, solo hay que
  // actualizar esta tabla sin tocar la lógica de detección.
  private readonly SELECTORS = {
    titleCandidates: [
      'meta[property="og:title"]', // "Kami no Shizuku Episodio 12"
      'h1.Title',                  // "Kami no Shizuku Episodio 12"
      'h2.SubTitle',               // Variante en algunas páginas
    ],
  };

  // Cualquier subdominio de animeflv.net (rotan www3 -> www4 -> ...)
  private readonly HOST_PATTERN = /(^|\.)animeflv\.net$/i;

  matches(url: string): boolean {
    try {
      const parsed = new URL(url);
      return this.HOST_PATTERN.test(parsed.hostname) && parsed.pathname.startsWith('/ver/');
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

      return {
        title,
        episode: this.extractEpisodeNumber(url),
        mediaType: 'anime',
        pageUrl: url,
      };
    } catch (error) {
      // Fallo silencioso: el adaptador no debe romper la navegación del usuario
      console.debug('[AnimeFlvAdapter] Detección falló:', error);
      return null;
    }
  }

  private extractTitle(document: Document): string | null {
    for (const selector of this.SELECTORS.titleCandidates) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractTextContent(element);
        if (text) {
          const cleaned = this.cleanTitle(text);
          if (cleaned) {
            return cleaned;
          }
        }
      }
    }

    // Fallback: document.title ("{Título} Episodio {N} Sub Español - AnimeFLV")
    if (document.title) {
      const cleaned = this.cleanTitle(document.title);
      if (cleaned) {
        return cleaned;
      }
    }

    return null;
  }

  /**
   * El número de episodio se extrae del último segmento numérico del slug:
   * /ver/kami-no-shizuku-12 -> 12
   * /ver/tensei-shitara-slime-datta-ken-4th-season-12 -> 12 (el "-12" final manda)
   * /ver/86-2 -> 2
   */
  private extractEpisodeNumber(url: string): number | undefined {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\/ver\/.+-(\d+)\/?$/i);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    } catch {
      // URL inválida: sin episodio
    }
    return undefined;
  }

  private extractTextContent(element: Element): string {
    // Las meta tags guardan su valor en el atributo content, no en textContent
    if (element.tagName === 'META') {
      return element.getAttribute('content')?.trim() || '';
    }
    return element.textContent?.trim() || '';
  }

  private cleanTitle(title: string): string {
    let cleaned = title;

    // Remover sufijos del sitio: "- AnimeFLV" / "| AnimeFLV"
    cleaned = cleaned.replace(/\s*[-|]\s*AnimeFLV\s*$/i, '');

    // Remover "Sub Español" (y variantes de idioma) al final
    cleaned = cleaned.replace(/\s+Sub\s*Español\s*$/i, '');
    cleaned = cleaned.replace(/\s+(Español|Latino|Castellano)\s*$/i, '');

    // Remover "Episodio N" al final (og:title: "{Título} Episodio {N}")
    cleaned = cleaned.replace(/\s+Episodio\s*\d+\s*$/i, '');

    // Normalizar espacios múltiples
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }
}
