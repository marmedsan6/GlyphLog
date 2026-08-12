import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';

/**
 * Smoke tests para la página de login.
 * Incluye tests de UI pública + login con credenciales reales.
 */

interface TestCredentials {
  email: string;
  password: string;
}

async function registerTestUser(page: Page): Promise<TestCredentials> {
  const email = `e2e-login-${Date.now()}@glyphlog.test`;
  const password = 'TestPass123!';

  const response = await page.request.post('/api/v1/auth/register', {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Failed to register test user: ${response.status()}`);
  }

  return { email, password };
}

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('should display login heading', async () => {
    await expect(loginPage.heading).toBeVisible();
  });

  test('should display email and password inputs', async () => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  });

  test('should display submit button', async () => {
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should display register link', async () => {
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('should navigate to register when clicking Regístrate link', async ({ page }) => {
    await loginPage.clickRegister();
    await expect(page).toHaveURL('/register');
  });

  test('should login successfully with registered credentials and redirect to /collection', async ({ page }) => {
    // ARRANGE — registrar usuario vía API para tener credenciales válidas
    const { email, password } = await registerTestUser(page);
    await loginPage.navigate();

    // ACT
    await loginPage.login(email, password);

    // ASSERT
    await expect(page).toHaveURL('/collection');
  });

  test('should show error with incorrect password', async ({ page }) => {
    // ARRANGE — registrar usuario y usar contraseña incorrecta
    const { email } = await registerTestUser(page);
    await loginPage.navigate();

    // ACT
    await loginPage.login(email, 'WrongPassword123!');

    // ASSERT
    await expect(loginPage.errorMessage).toBeVisible();
  });
});
