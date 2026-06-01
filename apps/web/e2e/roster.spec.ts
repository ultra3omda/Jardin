import { expect, test } from '@playwright/test';

/**
 * Roster CRUD E2E (@smoke) — proves the SCHOOL_ADMIN roster screens persist
 * real data (no demo fallback). Auth: 1-click demo-login as "Direction".
 *
 * Prerequisites (local / CI):
 *   docker compose up -d
 *   pnpm --filter=@ecole-saas/api prisma migrate deploy && prisma db seed
 *   pnpm --filter=@ecole-saas/api dev   # API on :4000
 *   (web auto-starts via playwright.config.ts webServer)
 */

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /Direction/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe('Roster — Teachers @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('create a teacher → appears in the table and survives a reload', async ({ page }) => {
    await page.goto('/teachers');
    await expect(page.getByRole('heading', { name: /Enseignants/i })).toBeVisible();

    // The header CTA and the empty-state CTA share the same label; on an empty
    // teachers list both are present, so target the first (header) one.
    await page.getByRole('button', { name: /Ajouter un enseignant/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const stamp = Date.now().toString(36);
    const email = `prof.e2e.${stamp}@demo-ecole.klasso.tn`;
    await page.getByLabel('Prénom', { exact: true }).fill('Test');
    await page.getByLabel('Nom', { exact: true }).fill(`Prof ${stamp}`);
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByRole('button', { name: /^Créer$/ }).click();

    // Success surfaces the temporary password modal
    await expect(page.getByRole('heading', { name: /Mot de passe temporaire/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: /J'ai noté/i }).click();

    // The new teacher is in the table…
    await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });

    // …and is still there after a full reload (persisted, not demo state).
    await page.reload();
    await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Roster — Classes @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('create → edit → delete a class', async ({ page }) => {
    await page.goto('/classes');
    await expect(page.getByRole('heading', { name: /^Classes$/ })).toBeVisible();

    const stamp = Date.now().toString(36);
    const name = `E2E-${stamp}`;
    const renamed = `${name}-edit`;

    // Create (schoolYear keeps its CURRENT_YEAR default)
    await page.getByRole('button', { name: /Nouvelle classe/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('#cls-name').fill(name);
    await page.locator('#cls-level').fill('CM1');
    await page.getByRole('button', { name: /Créer la classe/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('li', { hasText: name })).toBeVisible({ timeout: 10_000 });

    // Edit (rename)
    await page.locator('li', { hasText: name }).getByRole('button', { name: /Modifier/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('#edit-name').fill(renamed);
    await page.getByRole('button', { name: /Enregistrer/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('li', { hasText: renamed })).toBeVisible({ timeout: 10_000 });

    // Delete (confirm)
    await page.locator('li', { hasText: renamed }).getByRole('button', { name: /Supprimer/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /^Supprimer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('li', { hasText: renamed })).toHaveCount(0, { timeout: 10_000 });
  });
});
