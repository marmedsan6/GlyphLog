import { Page } from '@playwright/test';

/**
 * Helper para autenticación en tests protegidos.
 *
 * Registra un usuario vía API y guarda el token en localStorage del contexto
 * del navegador. Así los tests de páginas protegidas (collection, profile, etc.)
 * no necesitan pasar por el flujo de UI de login.
 *
 * Estrategia: email único con timestamp para no colisionar con la BD real.
 * Sin limpieza posterior (los tests usan emails únicos).
 */

export interface TestUser {
  email: string;
  password: string;
  token: string;
}

export async function createTestUserAndLogin(page: Page): Promise<TestUser> {
  const email = `e2e-${Date.now()}@glyphlog.test`;
  const password = 'TestPass123!';

  // Registrar vía API
  const response = await page.request.post('/api/v1/auth/register', {
    data: { email, password },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to register test user: ${response.status()} ${body}`);
  }

  const { access_token } = await response.json();

  // Guardar token en localStorage del contexto del navegador
  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
  }, access_token);

  return { email, password, token: access_token };
}
