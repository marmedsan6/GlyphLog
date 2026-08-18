/**
 * Utility helpers for GlyphLog E2E tests.
 */
import { Page } from '@playwright/test';
import { API_BASE_URL } from './test-config';

/** Wait for the app to be hydrated (React root mounted) */
export async function waitForApp(page: Page) {
  await page.waitForSelector('#root', { state: 'attached' });
  await page.waitForLoadState('domcontentloaded');
}

/** Generate a unique email for test accounts */
export function generateTestEmail(): string {
  const suffix = Date.now();
  return `e2e-test-${suffix}@example.com`;
}

export type EntryType = 'anime' | 'manga' | 'game';
export type EntryStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

export interface CreateEntryParams {
  title: string;
  type?: EntryType;
  status?: EntryStatus;
  progressTotal?: number;
}

export interface CreatedEntry {
  id: string;
  title: string;
  type: EntryType;
}

/**
 * Crea una entrada vía API usando multipart/form-data (igual que el frontend).
 * Requiere el token del usuario (obtenido con createTestUserAndLogin).
 *
 * El endpoint POST /api/v1/entries espera form-data (title, type, status,
 * progress_unit, progress_total, ...), no JSON.
 */
export async function createEntryViaApi(
  page: Page,
  token: string,
  params: CreateEntryParams
): Promise<CreatedEntry> {
  const type = params.type ?? 'anime';
  const status = params.status ?? 'watching';

  const response = await page.request.post(`${API_BASE_URL}/entries/`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      title: params.title,
      type,
      status,
      ...(params.progressTotal != null ? { progress_total: String(params.progressTotal) } : {}),
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create entry: ${response.status()} ${body}`);
  }

  const entry = await response.json();
  return { id: entry.id, title: entry.title, type: entry.type };
}

/**
 * Crea N entradas vía API de forma secuencial y devuelve sus metadatos.
 * Útil para tests de paginación (límite por página = 15).
 */
export async function createEntriesViaApi(
  page: Page,
  token: string,
  count: number,
  options: { type?: EntryType; titlePrefix?: string } = {}
): Promise<CreatedEntry[]> {
  const type = options.type ?? 'anime';
  const prefix = options.titlePrefix ?? 'E2E Entry';
  const created: CreatedEntry[] = [];

  for (let i = 1; i <= count; i += 1) {
    // Sufijo estable por índice para poder asercionar títulos concretos.
    created.push(
      await createEntryViaApi(page, token, {
        title: `${prefix} ${String(i).padStart(2, '0')}`,
        type,
      })
    );
  }

  return created;
}

/**
 * Actualiza el progreso de una entrada vía API (POST /entries/{id}/progress).
 * Crea un ProgressEvent inmutable, necesario para los tests de historial/reset.
 */
export async function updateProgressViaApi(
  page: Page,
  token: string,
  entryId: string,
  newValue: number,
  markCompleted = false
): Promise<void> {
  const response = await page.request.post(
    `${API_BASE_URL}/entries/${entryId}/progress`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { new_value: newValue, mark_completed: markCompleted },
    }
  );

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to update progress: ${response.status()} ${body}`);
  }
}

/**
 * Lee las entradas del usuario vía API (GET /entries).
 * Devuelve los títulos para poder asercionar qué se importó realmente en la BD.
 */
export async function getEntryTitlesViaApi(page: Page, token: string): Promise<string[]> {
  const response = await page.request.get(`${API_BASE_URL}/entries/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to list entries: ${response.status()} ${body}`);
  }

  const data = await response.json();
  return data.entries.map((entry: { title: string }) => entry.title);
}
