import { expect, test } from '@playwright/test';

/**
 * TEACHER flows E2E smoke (Vague 3 — refonte UX enseignant).
 *
 * Verifies the refactored teacher screens (3.1 → 3.4 + shared V2 screens) render
 * for a logged-in teacher without crashing or redirecting to login. The PageHeader
 * `<h1>` always renders regardless of demo data, so asserting the heading is a
 * resilient smoke check.
 *
 * Auth: 1-click demo-login as "Enseignant" (prof@demo-ecole.klasso.tn).
 */

async function loginAsTeacher(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /Enseignant/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

const TEACHER_SCREENS: { path: string; heading: RegExp }[] = [
  { path: '/evaluations', heading: /Évaluations/i },
  { path: '/notes', heading: /Saisie des notes/i },
  { path: '/absences', heading: /Absences & Présences/i },
  { path: '/homework', heading: /Devoirs/i },
  { path: '/schedule', heading: /Mon emploi du temps/i },
  { path: '/messages', heading: /Messages/i },
  { path: '/announcements', heading: /Annonces/i },
];

test.describe('Teacher flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('dashboard renders for a teacher', async ({ page }) => {
    // loginAsTeacher already landed on /dashboard — verify it is not blank.
    await expect(page.getByRole('button', { name: /Statistiques/i })).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  for (const screen of TEACHER_SCREENS) {
    test(`${screen.path} renders for a teacher without crashing`, async ({ page }) => {
      await page.goto(screen.path);

      // PageHeader <h1> must be visible → page loaded (not blank, not redirected).
      await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible({
        timeout: 15_000,
      });

      await expect(page).not.toHaveURL(/\/login/);
    });
  }
});
