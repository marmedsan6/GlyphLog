/**
 * Adaptador para Crunchyroll — detecta episodios en la página de reproducción
 * y extrae el título de la serie y número de episodio.
 */

import { SiteAdapter, DetectedMedia } from './types';

export class CrunchyrollAdapter implements SiteAdapter {
  // Selectores CSS con múltiples fallbacks, ya que el DOM de Crunchyroll cambia frecuentemente
  private readonly SELECTORS = {
    // Título del og:title/twitter u otros metas (puede incluir nombre de serie)
    titleCandidates: [
      'meta[property="og:title"]',           // Open Graph
      'meta[name="twitter:title"]',          // Twitter Card
      'h1.title',                            // Título en header
      'h1[data-qa="header-title"]',          // Atributo data-qa
      '.video-title h1',                     // Dentro de video-title
      '[data-qa="episode-heading"]',         // Episodio heading
    ],
    // Selectores específicos del NOMBRE DE LA SERIE en la página de reproducción.
    // Crunchyroll a veces usa un og:title del estilo "E{N} - {episodio}" sin
    // incluir el nombre de la serie; en ese caso, buscamos aquí directamente.
    seriesTitleCandidates: [
      '[data-t="series-title-link"]',         // Link al nombre de la serie (histórico)
      'a[data-t="show-title"]',               // Variante del mismo link
      'h1[data-testid="show-title"]',         // Nombre serie (post-rediseño)
      '[data-testid="sidebar-series-title"]', // Barra lateral del reproductor
      'a[href*="/series/"][class*="title"]',  // Enlace a la ficha de serie con clase title
      '.show-title-link',                    // Clase de enlace al nombre de la serie
      'a[href*="/series/"]',                 // Cualquier enlace a la ficha de serie
    ],
    // Número de episodio desde varios lugares
    episodeCandidates: [
      '[data-qa="episode-number"]',
      '.episode-number',
      '[class*="episode"][class*="number"]',
      'meta[property="episodenumber"]',
    ],
  };

  matches(url: string): boolean {
    // Detecta URLs de Crunchyroll watch pages (con o sin locale)
    // Ejemplos: 
    //   - crunchyroll.com/watch/...
    //   - crunchyroll.com/es-es/watch/...
    //   - www.crunchyroll.com/watch/...
    return /crunchyroll\.com\/.*(watch|ver)\//.test(url);
  }

  detect(document: Document, url: string): DetectedMedia | null {
    try {
      // Falla en silencio: si algo falla, retornar null sin romper nada
      const title = this.extractTitle(document);
      if (!title) {
        return null;
      }

      const episode = this.extractEpisodeNumber(document, url);

      return {
        title,
        episode,
        mediaType: 'anime',
        pageUrl: url,
      };
    } catch (error) {
      // Log silencioso: el adaptador no debe romper la página
      console.debug('[CrunchyrollAdapter] Detección falló:', error);
      return null;
    }
  }

  private extractTitle(document: Document): string | null {
    // Intentar con cada selector candidato
    for (const selector of this.SELECTORS.titleCandidates) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractTextContent(element);
        if (text) {
          const cleaned = this.cleanTitle(text);
          if (!this.isUsableTitle(cleaned)) {
            continue; // título genérico de navegación, probar siguiente
          }
          if (this.looksLikeEpisodeOnlyTitle(cleaned)) {
            // og:title tiene formato "E{N} - {episodio}" sin el nombre de la serie;
            // saltamos al próximo selector, que puede tener el nombre real.
            continue;
          }
          return cleaned;
        }
      }
    }

    // Cuando titleCandidates solo exponen el título del episodio (sin la serie),
    // buscar en selectores específicos del nombre de la serie en el DOM.
    for (const selector of this.SELECTORS.seriesTitleCandidates) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractTextContent(element);
        if (text) {
          const cleaned = this.cleanTitle(text);
          if (this.isUsableTitle(cleaned) && !this.looksLikeEpisodeOnlyTitle(cleaned)) {
            return cleaned;
          }
        }
      }
    }

    // Fallback: usar document.title
    const pageTitle = document.title;
    if (pageTitle) {
      const cleaned = this.cleanTitle(pageTitle);
      if (this.isUsableTitle(cleaned) && !this.looksLikeEpisodeOnlyTitle(cleaned)) {
        return cleaned;
      }
    }

    return null;
  }

  private isUsableTitle(title: string): boolean {
    if (!title) {
      return false;
    }

    // Durante la hidratación, Crunchyroll expone un título de marketing en
    // lugar de la serie. Aceptarlo crea entradas imposibles de asociar después.
    return !/^Crunchyroll(?:\s*[|:-]\s*|\s+)(?:Watch|Popular|Anime|Play|Games|Shop|Online)\b/i.test(title);
  }

  /**
   * Detecta el formato "E{N} - {episodio}" donde el og:title contiene SOLO
   * el título del episodio sin el nombre de la serie.
   * Ejemplos reales de One Piece en CR:
   *   "E895 - ¡Especial! Cidre, el mejor cazarrecompensas del mundo"
   *   "Ep. 895 - Side story: ..."
   */
  private looksLikeEpisodeOnlyTitle(title: string): boolean {
    return /^E\d+\s*[-–]/i.test(title) || /^Ep\.?\s*\d+\s*[-–]/i.test(title);
  }

  private extractEpisodeNumber(document: Document, url: string): number | undefined {
    // Primero intentar con selectores CSS
    for (const selector of this.SELECTORS.episodeCandidates) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractTextContent(element);
        const num = this.parseEpisodeNumber(text);
        if (num !== undefined) {
          return num;
        }
      }
    }

    // Fallback: extraer del título de la página (og:title o <title>)
    // Formato 1: "{Serie} Ep. {N}: {Título del episodio}"
    // Formato 2: "E{N} - {Título del episodio} | Crunchyroll"
    const metaTitle =
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.title ||
      '';
    const titleMatch = metaTitle.match(/\bEp(?:isode)?\.?\s*(\d+)\b/i);
    if (titleMatch?.[1]) {
      return parseInt(titleMatch[1], 10);
    }
    // Formato "E895 - ..."
    const shortEpMatch = metaTitle.match(/\bE(\d+)\s*[-–]/i);
    if (shortEpMatch?.[1]) {
      return parseInt(shortEpMatch[1], 10);
    }

    // Fallback: extraer del URL
    // URLs típicas: https://www.crunchyroll.com/watch/GXXXXXXXXXX/episode-N-titulo
    const urlMatch = url.match(/\/(?:episode|ep)-(\d+)/i);
    if (urlMatch?.[1]) {
      return parseInt(urlMatch[1], 10);
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
    // Remover "| Crunchyroll" si está presente
    let cleaned = title.replace(/\s*\|\s*Crunchyroll\s*$/i, '');

    // Remover "Ep. N: título del episodio" (formato og:title: "{Serie} Ep. {N}: {Título}")
    cleaned = cleaned.replace(/\s+Ep\.\s*\d+\s*:.*$/i, '');
    // Remover "Ep. N" o "Episode N" del inicio o final
    cleaned = cleaned.replace(/^Ep\.\s*\d+[\s:–-]+/i, '');
    cleaned = cleaned.replace(/\s+Ep\.\s*\d+[\s:–-]*$/i, '');
    cleaned = cleaned.replace(/^Episode\s*\d+[\s:–-]+/i, '');
    cleaned = cleaned.replace(/\s+Episode\s*\d+[\s:–-]*$/i, '');

    // Remover "(Sub)" o "(Dub)" con variaciones
    cleaned = cleaned.replace(/\s*\((Sub|Dub|Dubbed|Subtitled)\)\s*$/i, '');

    // Normalizar espacios múltiples
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  private parseEpisodeNumber(text: string): number | undefined {
    // Buscar patrones como "123", "Ep. 123", "Episode 123"
    const matches = text.match(/(?:ep(?:isode)?\.?\s*)?(\d+)/i);
    if (matches && matches[1]) {
      return parseInt(matches[1], 10);
    }
    return undefined;
  }
}
