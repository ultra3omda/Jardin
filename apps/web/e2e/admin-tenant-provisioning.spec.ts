import { test, expect } from '@playwright/test';

const SUPER_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const SUPER_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

// Skip locally / in CI unless super_admin creds are provided as env vars.
// CI can set these from secrets when a seeded super_admin is available.
test.describe('Super_admin tenant provisioning', () => {
  test.skip(!SUPER_EMAIL || !SUPER_PASSWORD, 'SUPER_ADMIN_EMAIL/PASSWORD env not set');

  test('login → create tenant → see URLs', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Email/).first().fill(SUPER_EMAIL!);
    await page.getByLabel(/Mot de passe/).fill(SUPER_PASSWORD!);
    await page.getByRole('button', { name: /Se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.getByRole('link', { name: /Administration/i }).click();
    await expect(page).toHaveURL(/\/admin\/tenants/);
    await expect(page.getByRole('heading', { name: /Écoles/i })).toBeVisible();

    await page.getByRole('link', { name: /Nouvelle école/i }).click();
    await expect(page).toHaveURL(/\/admin\/tenants\/new/);

    const uniqueSlug = `e2e-${Date.now().toString(36)}`;
    await page.getByLabel(/Nom de l'école/).fill(`E2E ${uniqueSlug}`);
    await page.getByLabel(/Slug/).fill(uniqueSlug);
    await page.getByLabel(/Prénom/).fill('E2E');
    await page.getByLabel(/^Nom de l'admin/).fill('Test');
    await page.getByLabel(/Email de l'admin/).fill(`admin@${uniqueSlug}.test`);
    await page.getByLabel(/Envoyer l'email/).uncheck();

    await page.getByRole('button', { name: /Créer l'école/i }).click();

    await expect(page.getByText(/École « E2E /)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Code école : ${uniqueSlug}`)).toBeVisible();
    await expect(page.locator('code', { hasText: `t/${uniqueSlug}/login` })).toBeVisible();
  });
});
