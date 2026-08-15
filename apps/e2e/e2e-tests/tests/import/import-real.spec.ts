import { test, expect } from '@playwright/test';
import { ImportPage } from '../../page-objects/ImportPage';
import { createTestUserAndLogin } from '../../utils/auth-helper';
import { getEntryTitlesViaApi } from '../../utils/helpers';

/**
 * Acceptance test de importación REAL (sin mock del LLM).
 *
 * A diferencia de `import.spec.ts` (que mockea /import/parse y /import/execute
 * para determinismo y coste), este test ejercita el flujo completo de punta a
 * punta contra el backend y Claude/Bedrock reales:
 *
 *   UI (texto libre) → Claude parsea → preview → execute → INSERT en PostgreSQL
 *
 * Requisitos de entorno:
 *   - El contenedor `api` debe tener credenciales reales del LLM configuradas
 *     (AI_COMPLETION_PROVIDER + Bedrock/OpenAI). Sin ellas, /import/parse
 *     devuelve 503 y este test falla (correctamente: valida el wiring real).
 *   - Es lento (30-60s) y consume tokens reales del LLM.
 *
 * Se usa un título fijo conocido y cada test crea un usuario único (colección
 * vacía), por lo que verificar que ese título aparece en la BD tras la
 * importación demuestra la persistencia real sin riesgo de colisión.
 */

test.describe('Importación real (sin mock)', () => {
  test('should parse and persist a real anime list via Claude', async ({ page }) => {
    test.setTimeout(120000);

    // ARRANGE — autenticar y definir el título a verificar (fijo, canónico)
    const { token } = await createTestUserAndLogin(page);
    const title = 'Cowboy Bebop';

    const importPage = new ImportPage(page);
    await importPage.navigate();

    // ACT — paso 1: fuente "Texto libre" y continuar
    await expect(importPage.heading).toBeVisible();
    await importPage.sourceCardText.click();
    await importPage.continueToPaste();

    // ACT — paso 2: pegar la lista y parsear (Claude real)
    await importPage.pasteContent(`${title} - Completed - 10/10\nSteins;Gate - Completed - 9/10`);
    await importPage.parse();

    // ASSERT — paso 3: preview con la entrada parseada (título canónico de Claude)
    await expect(importPage.previewHeading).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    // ACT — confirmar la importación
    await importPage.confirmImport();

    // ASSERT — redirige a la colección (el execute + enriquecimiento de géneros
    // hace llamadas extra a AniList/RAWG, por lo que puede tardar >10s)
    await expect(page).toHaveURL('/collection', { timeout: 60000 });

    // ASSERT — la entrada realmente se persistió en la BD (sin mock)
    const titles = await getEntryTitlesViaApi(page, token);
    expect(titles).toContain(title);
  });
});
