import { expect, test } from '@playwright/test';

/**
 * Billing page E2E smoke tests (@smoke).
 *
 * Prerequisites (local):
 *   docker compose up -d
 *   pnpm --filter=@ecole-saas/api prisma migrate deploy
 *   pnpm --filter=@ecole-saas/api dev   # API on :4000
 *   (web auto-starts via playwright.config.ts webServer)
 *
 * Auth strategy: 1-click demo-login as "Direction" (admin-primary / SCHOOL_ADMIN).
 * The DemoAccountsBlock on /login exposes persona buttons without needing
 * real credentials — works out-of-the-box against a seeded DB.
 */

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  // Click the "Direction" demo persona button (admin-primary = SCHOOL_ADMIN).
  await page.getByRole('button', { name: /Direction/i }).click();
  // Wait until we land on /dashboard (locale-prefixed URL).
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe('Billing @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('KPI cards are visible on /billing', async ({ page }) => {
    await page.goto('/billing');

    // Page heading
    await expect(page.getByRole('heading', { name: /Facturation/i })).toBeVisible();

    // 4 KPI cards identified by their stable label text.
    // Use .first() for labels that also appear in filter dropdowns.
    await expect(page.getByText('Total facturé').first()).toBeVisible();
    await expect(page.getByText('Encaissé').first()).toBeVisible();
    await expect(page.getByText('En attente').first()).toBeVisible();
    await expect(page.getByText('En retard').first()).toBeVisible();
  });

  test('create invoice → appears in table with status "En attente"', async ({ page }) => {
    await page.goto('/billing');

    // Open the create-invoice modal via the "+ Nouvelle facture" button
    await page.getByRole('button', { name: /Nouvelle facture/i }).first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nouvelle facture/i })).toBeVisible();

    // Title — unique suffix avoids collision with pre-existing rows
    const title = `Frais scolarité T1 ${Date.now().toString(36)}`;
    await page.getByLabel('Titre').fill(title);

    // Due date = next month (YYYY-MM-DD)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    await page.locator('#inv-due').fill(nextMonth.toISOString().slice(0, 10));

    // First line-item
    await page.getByLabel('Libellé article 1').fill('Frais inscription');
    await page.getByLabel('Prix unitaire article 1').fill('500');

    // Submit
    await page.getByRole('button', { name: /Créer la facture/i }).click();

    // Modal closes on success
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // Invoice appears in the table
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

    // Status badge = "En attente"
    const row = page.locator('tr', { hasText: title });
    await expect(row.getByText(/En attente/i)).toBeVisible();
  });

  test('record payment → invoice status changes to "Payé"', async ({ page }) => {
    await page.goto('/billing');

    // Create a fresh invoice so this test is fully self-contained
    await page.getByRole('button', { name: /Nouvelle facture/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const title = `Paiement test ${Date.now().toString(36)}`;
    await page.getByLabel('Titre').fill(title);

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    await page.locator('#inv-due').fill(nextMonth.toISOString().slice(0, 10));

    await page.getByLabel('Libellé article 1').fill('Article test');
    await page.getByLabel('Prix unitaire article 1').fill('200');

    await page.getByRole('button', { name: /Créer la facture/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

    // Click the payment button (💳) on the newly created row
    const row = page.locator('tr', { hasText: title });
    await row.getByRole('button', { name: /Enregistrer un paiement/i }).click();

    // Payment modal
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Enregistrer un paiement/i })).toBeVisible();

    // Amount — full invoice amount
    await page.locator('#pay-amount').fill('200');

    // Method: Espèces (cash) — radio label text
    await page.getByRole('radio', { name: /Espèces/i }).check();

    // Validate
    await page.getByRole('button', { name: /Valider le paiement/i }).click();

    // Modal closes
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // Status badge on the row should now be "Payé"
    await expect(row.getByText(/Payé/i)).toBeVisible({ timeout: 10_000 });
  });
});
