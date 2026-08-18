import { test, expect } from '@playwright/test';
import { CreateEntryPage } from '../../page-objects/CreateEntryPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';

/**
 * Acceptance tests para el selector de categoría del buscador inteligente
 * de catálogo (issue #56).
 *
 * Contrato (HU1):
 * - El selector muestra Animes / Mangas / Videojuegos y arranca en "Animes".
 * - Al elegir una categoría, la búsqueda externa solo devuelve ese tipo.
 *
 * La búsqueda consulta APIs externas (AniList/RAWG), así que se mockea con
 * page.route() para determinismo, velocidad y coste. El backend SÍ se usa
 * de verdad para autenticación; solo se intercepta la llamada al catálogo.
 */

// Resultados mock del catálogo para verificar que el filtro llega al backend.
const GAME_RESULT = {
  title: 'The Witcher 3',
  year: 2015,
  cover_image: null,
  type: 'game',
  source: 'RAWG',
  progress_total: null,
  slug: 'the-witcher-3',
};

const ANIME_RESULT = {
  title: 'Fullmetal Alchemist: Brotherhood',
  year: 2009,
  cover_image: null,
  type: 'anime',
  source: 'AniList',
  progress_total: '64',
  slug: null,
};

test.describe('Buscador inteligente — selector de categoría', () => {
  let createEntryPage: CreateEntryPage;

  test.beforeEach(async ({ page }) => {
    await createTestUserAndLogin(page);
    createEntryPage = new CreateEntryPage(page);
  });

  test('should default to Animes and only request anime results', async ({ page }) => {
    // ARRANGE — mockear la búsqueda externa devolviendo solo anime
    const requestedTypes: string[] = [];
    await page.route('**/api/v1/external/search**', async (route) => {
      const url = new URL(route.request().url());
      requestedTypes.push(url.searchParams.get('type') ?? '');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [ANIME_RESULT] }),
      });
    });

    await createEntryPage.navigate();

    // ASSERT — selector arranca en "Animes"
    await expect(createEntryPage.externalSearchTypeSelector).toHaveValue('anime');

    // ACT — escribir y esperar el autocompletado
    await createEntryPage.externalSearchInput.fill('fullmetal');

    // ASSERT — se solicitó type=anime y se muestra el resultado
    await expect(page.getByText('Fullmetal Alchemist: Brotherhood')).toBeVisible();
    expect(requestedTypes).toContain('anime');
  });

  test('should filter to Videojuegos when selecting the game category', async ({ page }) => {
    // ARRANGE — mockear devolviendo un juego (como haría RAWG)
    const requestedTypes: string[] = [];
    await page.route('**/api/v1/external/search**', async (route) => {
      const url = new URL(route.request().url());
      requestedTypes.push(url.searchParams.get('type') ?? '');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [GAME_RESULT] }),
      });
    });

    await createEntryPage.navigate();

    // ACT — cambiar el selector a "Videojuegos" y buscar
    await createEntryPage.externalSearchTypeSelector.selectOption('game');
    await createEntryPage.externalSearchInput.fill('witcher');

    // ASSERT — se solicitó type=game y se muestra el resultado de juego
    await expect(page.getByText('The Witcher 3')).toBeVisible();
    expect(requestedTypes).toContain('game');
  });
});
