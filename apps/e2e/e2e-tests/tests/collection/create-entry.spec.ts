import { test, expect } from '@playwright/test';
import { CreateEntryPage } from '../../page-objects/CreateEntryPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';

/**
 * Smoke tests para crear entradas de distinto tipo.
 * Requiere autenticación — usa createTestUserAndLogin() vía API.
 */

test.describe('Create Entry', () => {
  let createEntryPage: CreateEntryPage;

  test.beforeEach(async ({ page }) => {
    await createTestUserAndLogin(page);
    createEntryPage = new CreateEntryPage(page);
    await createEntryPage.navigate();
  });

  test('should display create entry form with heading', async () => {
    // ASSERT
    await expect(createEntryPage.heading).toBeVisible();
  });

  test('should display title input and submit button', async () => {
    // ASSERT
    await expect(createEntryPage.titleInput).toBeVisible();
    await expect(createEntryPage.submitButton).toBeVisible();
  });

  test('should create an anime entry and redirect to collection', async ({ page }) => {
    // ARRANGE
    const title = `E2E Anime ${Date.now()}`;

    // ACT
    await createEntryPage.fillTitle(title);
    await createEntryPage.selectType('anime');
    await createEntryPage.submit();

    // ASSERT
    await expect(page).toHaveURL('/collection');
    await expect(page.getByText(title)).toBeVisible();
  });

  test('should create a game entry and redirect to collection', async ({ page }) => {
    // ARRANGE
    const title = `E2E Game ${Date.now()}`;

    // ACT
    await createEntryPage.fillTitle(title);
    await createEntryPage.selectType('game');
    await createEntryPage.submit();

    // ASSERT
    await expect(page).toHaveURL('/collection');
    await expect(page.getByText(title)).toBeVisible();
  });
});
