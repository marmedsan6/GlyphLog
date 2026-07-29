/**
 * Tipos para la arquitectura de adaptadores de sitios.
 * Los adaptadores detectan y extraen información de media en distintos sitios.
 */

export type MediaType = 'anime' | 'manga' | 'game';

export interface DetectedMedia {
  /** Título de la serie/manga/juego */
  title: string;
  /** Número de episodio (para anime/manga) */
  episode?: number;
  /** Número de capítulo (para manga) */
  chapter?: number;
  /** Tipo de contenido detectado */
  mediaType: MediaType;
  /** URL de la página donde se detectó el media */
  pageUrl: string;
}

export interface SiteAdapter {
  /** Devuelve true si este adaptador puede manejar la URL */
  matches(url: string): boolean;
  /**
   * Intenta detectar media en la página.
   * Debe fallar en silencio (retornar null) si no encuentra media válida,
   * sin romper el contenido de la página.
   */
  detect(document: Document, url: string): DetectedMedia | null;
}

export type SiteAdapterConstructor = new () => SiteAdapter;
