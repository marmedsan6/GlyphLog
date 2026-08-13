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
