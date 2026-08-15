import { Page } from '@playwright/test';
import { API_BASE_URL } from './test-config';

/**
 * Helper para autenticación en tests protegidos.
 *
 * Registra un usuario vía API y guarda el token en sessionStorage del contexto
 * del navegador. Así los tests de páginas protegidas (collection, profile, etc.)
 * no necesitan pasar por el flujo de UI de login.
 *
 * El frontend lee el token desde sessionStorage con clave `glyphlog_access_token`
 * (ver apps/web/src/lib/auth-token.ts). Es sessionStorage (no localStorage) por
 * decisión de seguridad (ADR-004).
 *
 * Estrategia: email único con timestamp para no colisionar con la BD real.
 * Sin limpieza posterior (los tests usan emails únicos).
 */

export interface TestUser {
  email: string;
  password: string;
  token: string;
}

/** Clave exacta que usa el frontend para leer el token (ver auth-token.ts). */
const TOKEN_KEY = 'glyphlog_access_token';

/**
 * Registra un usuario único vía API y devuelve sus credenciales + token,
 * sin tocar el estado del navegador. Útil para el login por UI (donde el
 * propio formulario persiste el token).
 */
export async function registerTestUser(page: Page): Promise<TestUser> {
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'TestPass123!';

  const response = await page.request.post(`${API_BASE_URL}/auth/register`, {
    data: { email, password },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to register test user: ${response.status()} ${body}`);
  }

  const { access_token } = await response.json();
  return { email, password, token: access_token };
}

export async function createTestUserAndLogin(page: Page): Promise<TestUser> {
  const user = await registerTestUser(page);

  // Guardar token en sessionStorage del contexto del navegador.
  // La app lo lee con getAccessToken() (sessionStorage.getItem).
  await page.goto('/');
  await page.evaluate(
    ([key, token]) => {
      sessionStorage.setItem(key, token);
    },
    [TOKEN_KEY, user.token] as const
  );

  return user;
}
