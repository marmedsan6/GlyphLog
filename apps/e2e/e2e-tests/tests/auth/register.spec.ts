import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../page-objects/RegisterPage';

/**
 * Smoke tests para la página de registro.
 * Usa emails únicos con timestamp para no colisionar con la BD real.
 * Sin limpieza posterior.
 */

function testEmail(): string {
  return `e2e-reg-${Date.now()}@glyphlog.test`;
}

test.describe('Register Page', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.navigate();
  });

  test('should display register form heading', async () => {
    await expect(registerPage.heading).toBeVisible();
  });

  test('should display email, password and confirm password inputs', async () => {
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
  });

  test('should display submit button', async () => {
    await expect(registerPage.submitButton).toBeVisible();
  });

  test('should show error when passwords do not match', async () => {
    // ARRANGE
    const email = testEmail();

    // ACT
    await registerPage.fillEmail(email);
    await registerPage.fillPassword('TestPass123!');
    await registerPage.fillConfirmPassword('DifferentPass!');
    await registerPage.submit();

    // ASSERT
    await expect(registerPage.errorMessage).toBeVisible();
    await expect(registerPage.errorMessage).toContainText(/no coinciden/i);
  });

  test('should register successfully with valid data and redirect to /collection', async ({ page }) => {
    // ARRANGE
    const email = testEmail();
    const password = 'TestPass123!';

    // ACT
    await registerPage.register(email, password);

    // ASSERT
    await expect(page).toHaveURL('/collection');
  });

  test('should navigate to login when clicking login link', async ({ page }) => {
    // ACT
    await registerPage.clickLoginLink();

    // ASSERT
    await expect(page).toHaveURL('/login');
  });
});
