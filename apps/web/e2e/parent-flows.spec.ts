import { expect, test } from '@playwright/test';

/**
 * PARENT flows E2E smoke (Vague 2 — refonte UX parent).
 *
 * Verifies every refactored parent screen (2.3 → 2.6) renders for a logged-in
 * parent without crashing or redirecting to login. The PageHeader `<h1>` always
 * renders regardless of demo data, so asserting the heading is a resilient smoke
 * check (no dependency on seeded children/invoices/grades).
 *
 * Auth: 1-click demo-login as "Parent" (parent@demo-ecole.klasso.tn).
 */

async function loginAsParent(page: import('@playwright/test').Page) {
  await page.goto('/login');
  // Primary "Parent" persona button (rendered before the expandable extras).
  await page.getByRole('button', { name: /Parent/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

const PARENT_SCREENS: { path: string; heading: RegExp }[] = [
  { path: '/payments', heading: /Paiements/i },
  { path: '/notes', heading: /Notes de mes enfants/i },
  { path: '/bulletins', heading: /Bulletins/i },
  { path: '/messages', heading: /Messages/i },
  { path: '/announcements', heading: /Annonces/i },
  { path: '/absences', heading: /Présences de mes enfants/i },
  { path: '/schedule', heading: /Emploi du temps/i },
];

test.describe('Parent flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParent(page);
  });

  for (const screen of PARENT_SCREENS) {
    test(`${screen.path} renders for a parent without crashing`, async ({ page }) => {
      await page.goto(screen.path);

      // PageHeader <h1> must be visible → page loaded (not blank, not redirected).
      await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible({
        timeout: 15_000,
      });

      // The parent must not be bounced back to the login screen.
      await expect(page).not.toHaveURL(/\/login/);
    });
  }
});
