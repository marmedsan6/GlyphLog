/**
 * Tests para el adaptador de Crunchyroll.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CrunchyrollAdapter } from '../crunchyroll';
import { DetectedMedia } from '../types';

describe('CrunchyrollAdapter', () => {
  let adapter: CrunchyrollAdapter;

  beforeEach(() => {
    adapter = new CrunchyrollAdapter();
  });

  describe('matches()', () => {
    it('debe retornar true para URLs de watch en Crunchyroll', () => {
      const urls = [
        'https://www.crunchyroll.com/watch/GJ0DJD14R/heavenly-restriction',
        'http://crunchyroll.com/watch/ABC123XYZ/ep-1-title',
        'https://crunchyroll.com/watch/XYZABC/episodio-1',
      ];

      urls.forEach((url) => {
        expect(adapter.matches(url)).toBe(true);
      });
    });

    it('debe retornar false para URLs que no son watch pages', () => {
      const urls = [
        'https://www.crunchyroll.com/series/GJ0DJD14R/jujutsu-kaisen-2',
        'https://www.crunchyroll.com/',
        'https://www.netflix.com/watch/abc123',
        'https://example.com',
      ];

      urls.forEach((url) => {
        expect(adapter.matches(url)).toBe(false);
      });
    });
  });

  describe('detect()', () => {
    it('debe detectar título y episodio desde og:title', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Jujutsu Kaisen 2 Ep. 1: Heavenly Restriction | Crunchyroll">
          </head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/watch/ABC123/ep-1');

      expect(result).not.toBeNull();
      expect(result?.title).toMatch(/Jujutsu Kaisen 2/);
      expect(result?.episode).toBe(1);
      expect(result?.mediaType).toBe('anime');
    });

    it('debe limpiar "(Sub)" del título', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Anime Title (Sub) | Crunchyroll">
          </head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/watch/ABC123/ep-1');

      expect(result?.title).not.toContain('(Sub)');
      expect(result?.title).toBe('Anime Title');
    });

    it('debe remover "| Crunchyroll" del título', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Anime Title | Crunchyroll">
          </head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/watch/ABC123/ep-1');

      expect(result?.title).toBe('Anime Title');
      expect(result?.title).not.toContain('Crunchyroll');
    });

    it('debe extraer el episodio desde el URL si no está en el DOM', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Anime Title">
          </head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(
        doc,
        'https://www.crunchyroll.com/watch/ABC123/episode-42-titulo'
      );

      expect(result?.episode).toBe(42);
    });

    it('debe ignorar formato "E{N} - episodio" en og:title y buscar el nombre de serie en el DOM', () => {
      // Reproduce el caso real de One Piece ep. 895 en Crunchyroll:
      // el og:title tiene solo el título del episodio, el nombre de la
      // serie está en un enlace [data-t="series-title-link"].
      const html = `
        <html>
          <head>
            <meta property="og:title" content="E895 - \u00a1Especial! Cidre, el mejor cazarrecompensas del mundo | Crunchyroll">
          </head>
          <body>
            <a data-t="series-title-link" href="/es-es/series/0019A/one-piece">One Piece</a>
          </body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/es-es/watch/G6EXD5KQR/side-story');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('One Piece');
      expect(result?.episode).toBe(895); // extraído del og:title "E895 - ..."
      expect(result?.mediaType).toBe('anime');
    });

    it('debe retornar null cuando og:title es "E{N} - ..." y no hay selector de serie en el DOM', () => {
      // Sin nombre de serie en ningún selector, debe retornar null y esperar
      // el siguiente reintento de detectMediaWithRetry.
      const html = `
        <html>
          <head>
            <meta property="og:title" content="E895 - \u00a1Especial! Cidre | Crunchyroll">
          </head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/es-es/watch/G6EXD5KQR/side-story');

      expect(result).toBeNull();
    });

    it('debe extraer el número de episodio del formato "E{N} - ..." en og:title', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="E23 - Un nuevo compañero | Crunchyroll">
          </head>
          <body>
            <a data-t="series-title-link" href="/series/anime-xyz">Anime XYZ</a>
          </body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/watch/ABC/ep-23');

      expect(result?.title).toBe('Anime XYZ');
      expect(result?.episode).toBe(23);
    });

    it('debe ignorar el título genérico de navegación durante la hidratación', () => {
      const html = `
        <html>
          <head>
            <title>Crunchyroll Watch Popular Anime Play Games Shop Online</title>
          </head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/watch/ABC123/ep-1');

      expect(result).toBeNull();
    });

    it('debe retornar null si no encuentra título', () => {
      const html = `<html><head></head><body></body></html>`;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/watch/ABC123/ep-1');

      expect(result).toBeNull();
    });

    it('debe manejar errores sin romper la página', () => {
      // Simular un documento inválido o incompleto
      const doc = {
        querySelector: () => null,
        title: '',
      } as any;

      // No debe lanzar un error
      expect(() => {
        adapter.detect(doc, 'https://www.crunchyroll.com/watch/ABC123/ep-1');
      }).not.toThrow();

      // Debe retornar null
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/watch/ABC123/ep-1');
      expect(result).toBeNull();
    });
  });

  describe('Casos de uso comunes', () => {
    it('debe detectar "Jujutsu Kaisen Ep. 1"', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Jujutsu Kaisen Ep. 1: Heavenly Restriction | Crunchyroll">
          </head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/watch/GJ0DJD14R/heavenly-restriction');

      expect(result?.title).toBe('Jujutsu Kaisen');
      expect(result?.episode).toBe(1);
    });

    it('debe normalizar "One Piece Ep. 23: Raid"', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="One Piece Ep. 23: Raid (Dub) | Crunchyroll">
          </head>
          <body></body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, 'https://www.crunchyroll.com/watch/ABC123/ep-23');

      expect(result?.title).toBe('One Piece');
      expect(result?.episode).toBe(23);
    });

    it('debe devolver pageUrl correcto', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Test Anime">
          </head>
          <body></body>
        </html>
      `;
      const url = 'https://www.crunchyroll.com/watch/XYZ789/test-ep';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, url);

      expect(result?.pageUrl).toBe(url);
    });
  });
});
