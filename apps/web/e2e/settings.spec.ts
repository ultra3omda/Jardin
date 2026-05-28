import { expect, test } from '@playwright/test';

/**
 * Settings page E2E smoke tests (@smoke).
 * Covers: Settings › Matières (subjects) and Settings › Trimestres (grade periods).
 *
 * Prerequisites (local):
 *   docker compose up -d
 *   pnpm --filter=@ecole-saas/api prisma migrate deploy
 *   pnpm --filter=@ecole-saas/api dev   # API on :4000
 *   (web auto-starts via playwright.config.ts webServer)
 *
 * Auth strategy: 1-click demo-login as "Direction" (admin-primary / SCHOOL_ADMIN).
 */

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /Direction/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe('Settings — Subjects @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('create subject → appears in table', async ({ page }) => {
    await page.goto('/settings/subjects');

    // Page heading
    await expect(page.getByRole('heading', { name: /Matières/i })).toBeVisible();

    // Open the create modal
    await page.getByRole('button', { name: /Nouvelle matière/i }).click();

    // Modal appears with the correct title
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Nouvelle matière/i).first()).toBeVisible();

    // Fill the subject name (unique to avoid collision with seeded subjects)
    const subjectName = `Informatique ${Date.now().toString(36)}`;
    await page.locator('#subject-name').fill(subjectName);

    // Emoji
    await page.locator('#subject-emoji').fill('💻');

    // Coefficient = 2
    await page.locator('#subject-coeff').fill('2');

    // Submit
    await page.getByRole('button', { name: /Créer/i }).click();

    // Modal closes
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // New subject appears in the table
    await expect(page.getByText(subjectName)).toBeVisible({ timeout: 10_000 });

    // The row should contain the coefficient value
    const row = page.locator('tr', { hasText: subjectName });
    await expect(row.getByText('2', { exact: true })).toBeVisible();
  });
});

test.describe('Settings — Grade Periods @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('create grade period → appears in table with status "Ouvert"', async ({ page }) => {
    await page.goto('/settings/grade-periods');

    // Page heading (matches "Trimestres / Périodes de notation")
    await expect(
      page.getByRole('heading', { name: /Trimestres/i }),
    ).toBeVisible();

    // Open the create modal
    await page.getByRole('button', { name: /Nouveau trimestre/i }).click();

    // Modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Nouvelle période/i).first()).toBeVisible();

    // Fill period name — unique to avoid collision with seeded T1/T2/T3
    const periodName = `3ème Trimestre E2E ${Date.now().toString(36)}`;
    await page.locator('#gp-name').fill(periodName);

    // Start and end dates (YYYY-MM-DD; end must be after start)
    await page.locator('#gp-start').fill('2026-03-01');
    await page.locator('#gp-end').fill('2026-06-30');

    // Submit
    await page.getByRole('button', { name: /Créer/i }).click();

    // Modal closes
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // Period appears in the table
    await expect(page.getByText(periodName)).toBeVisible({ timeout: 10_000 });

    // Status badge should read "Ouvert"
    const row = page.locator('tr', { hasText: periodName });
    await expect(row.getByText(/Ouvert/i)).toBeVisible();
  });
});
