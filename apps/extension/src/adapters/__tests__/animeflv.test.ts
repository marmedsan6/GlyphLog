/**
 * Tests para el adaptador de AnimeFLV.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AnimeFlvAdapter } from '../animeflv';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'animeflv-episode.html');
const EPISODE_URL = 'https://www4.animeflv.net/ver/kami-no-shizuku-12';

function loadFixture(): Document {
  const html = readFileSync(FIXTURE_PATH, 'utf-8');
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('AnimeFlvAdapter', () => {
  let adapter: AnimeFlvAdapter;

  beforeEach(() => {
    adapter = new AnimeFlvAdapter();
  });

  describe('matches()', () => {
    it('debe retornar true para URLs de episodio en cualquier subdominio de AnimeFLV', () => {
      const urls = [
        'https://www3.animeflv.net/ver/one-piece-1108',
        'https://www4.animeflv.net/ver/kami-no-shizuku-12',
        'https://animeflv.net/ver/kami-no-shizuku-12',
        'https://m.animeflv.net/ver/kami-no-shizuku-12',
        'http://www3.animeflv.net/ver/one-piece-1108',
      ];

      urls.forEach((url) => {
        expect(adapter.matches(url)).toBe(true);
      });
    });

    it('debe retornar false para páginas que no son de episodio', () => {
      const urls = [
        'https://www4.animeflv.net/',
        'https://www4.animeflv.net/anime/kami-no-shizuku',
        'https://www4.animeflv.net/browse',
        'https://www4.animeflv.net/animes?page=2',
      ];

      urls.forEach((url) => {
        expect(adapter.matches(url)).toBe(false);
      });
    });

    it('debe retornar false para otros dominios', () => {
      const urls = [
        'https://www.crunchyroll.com/watch/ABC123/ep-1',
        'https://animeflv.fake-clone.com/ver/one-piece-1',
        'https://example.com/ver/kami-no-shizuku-12',
        'not-a-url',
      ];

      urls.forEach((url) => {
        expect(adapter.matches(url)).toBe(false);
      });
    });
  });

  describe('detect()', () => {
    it('debe detectar título y episodio desde el fixture real', () => {
      const doc = loadFixture();
      const result = adapter.detect(doc, EPISODE_URL);

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Kami no Shizuku');
      expect(result?.episode).toBe(12);
      expect(result?.mediaType).toBe('anime');
      expect(result?.pageUrl).toBe(EPISODE_URL);
    });

    it('debe extraer el episodio desde la URL aunque el DOM no lo tenga', () => {
      const html = `
        <html>
          <head><meta property="og:title" content="One Piece Episodio 1108"/></head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www3.animeflv.net/ver/one-piece-1108');

      expect(result?.title).toBe('One Piece');
      expect(result?.episode).toBe(1108);
    });

    it('debe usar el último segmento numérico del slug aunque el título tenga números', () => {
      const html = `
        <html>
          <head><meta property="og:title" content="Tensei shitara Slime Datta Ken 4th Season Episodio 12"/></head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(
        doc,
        'https://www4.animeflv.net/ver/tensei-shitara-slime-datta-ken-4th-season-12'
      );

      expect(result?.title).toBe('Tensei shitara Slime Datta Ken 4th Season');
      expect(result?.episode).toBe(12);
    });

    it('debe limpiar "Sub Español - AnimeFLV" del document.title como fallback', () => {
      const html = `
        <html>
          <head><title>Kami no Shizuku Episodio 12 Sub Español - AnimeFLV</title></head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, EPISODE_URL);

      expect(result?.title).toBe('Kami no Shizuku');
    });

    it('debe usar h1.Title si no hay og:title', () => {
      const html = `
        <html>
          <head><title></title></head>
          <body><h1 class="Title">Jujutsu Kaisen Episodio 47</h1></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www4.animeflv.net/ver/jujutsu-kaisen-47');

      expect(result?.title).toBe('Jujutsu Kaisen');
      expect(result?.episode).toBe(47);
    });

    it('debe retornar null si no encuentra título (fallo silencioso)', () => {
      const html = `<html><head></head><body></body></html>`;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, EPISODE_URL);

      expect(result).toBeNull();
    });

    it('debe manejar un DOM con estructura inesperada sin romper la página', () => {
      // Simula que AnimeFLV cambió su estructura: el fallo debe ser silencioso
      const doc = {
        querySelector: () => {
          throw new Error('DOM inesperado');
        },
        title: '',
      } as any;

      expect(() => {
        adapter.detect(doc, EPISODE_URL);
      }).not.toThrow();

      expect(adapter.detect(doc, EPISODE_URL)).toBeNull();
    });

    it('debe retornar media sin episodio si la URL no termina en número (películas/OVAs)', () => {
      const html = `
        <html>
          <head><meta property="og:title" content="Suzume Sub Español"/></head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www4.animeflv.net/ver/suzume');

      expect(result?.title).toBe('Suzume');
      expect(result?.episode).toBeUndefined();
    });
  });
});
