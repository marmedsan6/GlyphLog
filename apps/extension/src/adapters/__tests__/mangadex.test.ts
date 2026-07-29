/**
 * Tests para el adaptador de MangaDex.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MangaDexAdapter } from '../mangadex';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'mangadex-chapter.html');
const CHAPTER_URL =
  'https://mangadex.org/chapter/7904b246-9301-49fb-81ef-92294973d441';

function loadFixture(): Document {
  const html = readFileSync(FIXTURE_PATH, 'utf-8');
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('MangaDexAdapter', () => {
  let adapter: MangaDexAdapter;

  beforeEach(() => {
    adapter = new MangaDexAdapter();
  });

  describe('matches()', () => {
    it('debe retornar true para URLs de capítulo con UUID', () => {
      const urls = [
        'https://mangadex.org/chapter/7904b246-9301-49fb-81ef-92294973d441',
        'https://mangadex.org/chapter/7904b246-9301-49fb-81ef-92294973d441/1',
      ];

      urls.forEach((url) => {
        expect(adapter.matches(url)).toBe(true);
      });
    });

    it('debe retornar false para páginas que no son capítulo', () => {
      const urls = [
        'https://mangadex.org/',
        'https://mangadex.org/titles/latest',
        'https://mangadex.org/title/42629cfc-527c-41b8-8336-58af877f5c9a/all-saints-street',
        'https://mangadex.org/chapter/not-a-uuid',
      ];

      urls.forEach((url) => {
        expect(adapter.matches(url)).toBe(false);
      });
    });

    it('debe retornar false para otros dominios', () => {
      const urls = [
        'https://www.crunchyroll.com/watch/ABC123/ep-1',
        'https://mangadex.fake-clone.com/chapter/7904b246-9301-49fb-81ef-92294973d441',
        'not-a-url',
      ];

      urls.forEach((url) => {
        expect(adapter.matches(url)).toBe(false);
      });
    });
  });

  describe('detect()', () => {
    it('debe detectar título y capítulo desde el fixture real', () => {
      const doc = loadFixture();
      const result = adapter.detect(doc, CHAPTER_URL);

      expect(result).not.toBeNull();
      expect(result?.title).toBe('All Saints Street');
      expect(result?.chapter).toBe(427);
      expect(result?.mediaType).toBe('manga');
      expect(result?.pageUrl).toBe(CHAPTER_URL);
    });

    it('debe aplicar Math.floor a capítulos decimales', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Bug Ego - Ch. 3.6 - Posfácio - MangaDex" />
            <title>1 | Chapter 3.6 - Bug Ego - MangaDex</title>
          </head>
          <body>
            <a class="reader--header-manga" href="/title/abc">Bug Ego</a>
            <div class="reader--meta chapter">Vol. 1 Ch. 3.6</div>
          </body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(
        doc,
        'https://mangadex.org/chapter/4ce87d07-077c-4152-91b6-b3018820b3b9'
      );

      expect(result?.title).toBe('Bug Ego');
      expect(result?.chapter).toBe(3);
    });

    it('debe tratar oneshots sin número como Cap. 1', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Oneshot Manga - Oneshot - MangaDex" />
            <title>1 | Oneshot - Oneshot Manga - MangaDex</title>
          </head>
          <body>
            <a class="reader--header-manga" href="/title/abc">Oneshot Manga</a>
            <div class="reader--meta chapter">Oneshot</div>
          </body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(
        doc,
        'https://mangadex.org/chapter/11111111-1111-1111-1111-111111111111'
      );

      expect(result?.title).toBe('Oneshot Manga');
      expect(result?.chapter).toBe(1);
    });

    it('debe extraer el título de og:title si falta el header', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="My Manga - Ch. 10 - Title - MangaDex" />
            <title>1 | Chapter 10 - My Manga - MangaDex</title>
          </head>
          <body>
            <div class="reader--meta chapter">Ch. 10</div>
          </body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(
        doc,
        'https://mangadex.org/chapter/22222222-2222-2222-2222-222222222222'
      );

      expect(result?.title).toBe('My Manga');
      expect(result?.chapter).toBe(10);
    });

    it('debe extraer el título de document.title si no hay otras fuentes', () => {
      const html = `
        <html>
          <head>
            <title>1 | Chapter 7 - Fallback Title - MangaDex</title>
          </head>
          <body>
            <div class="reader--meta chapter">Ch. 7</div>
          </body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(
        doc,
        'https://mangadex.org/chapter/33333333-3333-3333-3333-333333333333'
      );

      expect(result?.title).toBe('Fallback Title');
      expect(result?.chapter).toBe(7);
    });

    it('debe retornar null si no encuentra título (fallo silencioso)', () => {
      const html = `
        <html>
          <head><title>MangaDex</title></head>
          <body>
            <div class="reader--meta chapter">Ch. 5</div>
          </body>
        </html>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const result = adapter.detect(doc, CHAPTER_URL);

      expect(result).toBeNull();
    });

    it('debe manejar un DOM con estructura inesperada sin romper la página', () => {
      const doc = {
        querySelector: () => {
          throw new Error('DOM inesperado');
        },
        title: '',
      } as any;

      expect(() => {
        adapter.detect(doc, CHAPTER_URL);
      }).not.toThrow();

      expect(adapter.detect(doc, CHAPTER_URL)).toBeNull();
    });
  });
});
