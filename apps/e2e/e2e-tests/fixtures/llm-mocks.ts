/**
 * Fixtures y helpers para mockear las llamadas al LLM (Claude/Bedrock) en E2E.
 *
 * Los flujos de importación, recomendaciones y chat dependen de Claude/Bedrock
 * (externo, costoso, lento 30-60s, no determinista). Para los acceptance tests
 * se interceptan con page.route() y se devuelven respuestas deterministas.
 *
 * Los patrones usan un glob del estilo `**\/api\/v1\/...` porque el frontend
 * llama directo a `http://localhost:8000/api/v1` (VITE_API_URL), no al proxy Vite.
 */
import type { Page } from '@playwright/test';

/** Entrada parseada de importación (forma de ParsedEntry del frontend). */
export interface MockParsedEntry {
  title: string;
  type: 'anime' | 'manga' | 'game';
  status: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';
  rating: number | null;
  current_progress: number | null;
  progress_total: number | null;
  year: number | null;
  notes: string | null;
  confidence: number;
}

export const mockParsedEntries: MockParsedEntry[] = [
  {
    title: 'Steins;Gate',
    type: 'anime',
    status: 'completed',
    rating: 9,
    current_progress: 24,
    progress_total: 24,
    year: 2011,
    notes: 'Clásico de ciencia ficción',
    confidence: 0.95,
  },
  {
    title: 'Fullmetal Alchemist: Brotherhood',
    type: 'anime',
    status: 'watching',
    rating: 8,
    current_progress: 30,
    progress_total: 64,
    year: 2009,
    notes: null,
    confidence: 0.92,
  },
];

export const mockRecommendations = {
  recommendations: [
    {
      title: 'Monster',
      type: 'anime',
      match_percentage: 94,
      reason: 'Suspense psicológico con personajes complejos, similar a Steins;Gate',
      genres: ['Mystery', 'Drama', 'Psychological'],
      year: 2004,
      external_url: 'https://myanimelist.net/anime/19/Monster',
      cover_image_url: null,
      similar_to: ['Steins;Gate'],
    },
    {
      title: 'Psycho-Pass',
      type: 'anime',
      match_percentage: 89,
      reason: 'Thriller distópico con dilemas morales',
      genres: ['Sci-Fi', 'Action', 'Psychological'],
      year: 2012,
      external_url: 'https://myanimelist.net/anime/13601/Psycho-Pass',
      cover_image_url: null,
      similar_to: ['Steins;Gate'],
    },
  ],
  metadata: {
    analyzed_entries: 5,
    favorite_genres: ['Sci-Fi', 'Psychological'],
    avg_rating: 8.5,
    completion_rate: 0.7,
    tokens_used: 32000,
    model: 'claude-haiku-4-5',
  },
};

/** Body SSE que devuelve el mock del chat (streaming). */
export const mockChatSseBody = [
  'data: {"conversation_id":"mock-conversation-1"}',
  '',
  'data: {"delta":"Hola"}',
  '',
  'data: {"delta":" soy GlyphAI, tu asistente."}',
  '',
  'data: [DONE]',
  '',
  '',
].join('\n');

/**
 * Mockea el endpoint de parseo de importación.
 */
export async function mockImportParse(page: Page) {
  await page.route('**/api/v1/import/parse', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: mockParsedEntries, warnings: [] }),
    })
  );
}

/**
 * Mockea el endpoint de ejecución de importación.
 */
export async function mockImportExecute(page: Page) {
  await page.route('**/api/v1/import/execute', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ created: 2, skipped: 0, errors: [] }),
    })
  );
}

/**
 * Mockea el endpoint de generación de recomendaciones.
 */
export async function mockRecommendationsGenerate(page: Page) {
  await page.route('**/api/v1/recommendations/generate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRecommendations),
    })
  );
}

/**
 * Mockea el endpoint de chat (streaming SSE).
 *
 * El frontend usa fetch + ReadableStream (streamChat en ai.service.ts) y parsea
 * líneas `data: ...`. Devolvemos content-type text/event-stream con el body SSE.
 */
export async function mockChat(page: Page) {
  await page.route('**/api/v1/ai/chat', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: mockChatSseBody,
    })
  );
}

export const mockYoutubeDiscovery = {
  conversation_id: 'mock-conv-yt',
  suggestions: [
    {
      title: 'Neon Genesis Evangelion',
      type: 'anime',
      mentioned_by: 'iLuTV',
      video_title: 'POR QUÉ EVANGELION ES UNA OBRA MAESTRA',
      video_url: 'https://www.youtube.com/watch?v=abc123',
      opinion: 'positive',
      rating: 10,
      timestamp: '5:20',
      in_collection: false,
      external_url: null,
      cover_image_url: null,
    },
    {
      title: 'Chainsaw Man',
      type: 'anime',
      mentioned_by: 'iLuTV',
      video_title: 'Análisis Chainsaw Man',
      video_url: 'https://www.youtube.com/watch?v=def456',
      opinion: 'positive',
      rating: 9,
      timestamp: '2:15',
      in_collection: false,
      external_url: null,
      cover_image_url: null,
    },
  ],
  metadata: {
    channels_analyzed: 1,
    videos_analyzed: 20,
    titles_found: 2,
    new_suggestions: 2,
    tokens_used: 0,
    analyzed_at: '2026-08-18T12:00:00Z',
  },
};

/**
 * Mockea el endpoint de descubrimiento YouTube en el chat.
 */
export async function mockYoutubeDiscoveryEndpoint(page: Page) {
  await page.route('**/api/v1/ai/youtube', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockYoutubeDiscovery),
    })
  );
}
