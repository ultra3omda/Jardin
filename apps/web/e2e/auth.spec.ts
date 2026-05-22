import { expect, test } from '@playwright/test';

/**
 * Auth UI smoke tests (V1.5).
 *
 * Note: the full register → email-verify → login → password-reset → /me
 * flow is now thoroughly covered by the API e2e suite (8 specs under
 * apps/api/test/*.e2e-spec.ts — invite-flow, email-verification,
 * password-recovery, profile, auth, multi-tenant-isolation, …).
 * Playwright tests here focus on the UI smoke: invite-only register
 * landing, login error display, protected route redirection, and the
 * new /forgot-password reachability.
 *
 * Prerequisites (local):
 *   docker compose up -d
 *   pnpm --filter=@ecole-saas/api prisma migrate deploy
 *   pnpm --filter=@ecole-saas/api dev   # API on :4000
 *   (web auto-starts via playwright.config.ts webServer)
 */

test.describe('Auth UI smoke', () => {
  test('GET /register without a token shows the invite-only landing card', async ({
    page,
  }) => {
    // V1.5 (Q4=B): /register is invite-only. Without ?token=… the page
    // renders the NoInviteCard instead of the form.
    await page.goto('/register');

    await expect(
      page.getByRole('heading', { name: 'Inscription sur invitation' }),
    ).toBeVisible();
    await expect(page.getByText(/uniquement sur invitation/i)).toBeVisible();
    // The contact email must be reachable from the card so prospects can
    // request access.
    await expect(page.getByRole('link', { name: /ultra3omda@gmail\.com/ })).toBeVisible();
    // "Retour à la connexion" affordance.
    await expect(page.getByRole('link', { name: /Retour à la connexion/i })).toBeVisible();

    // The actual create-account form must NOT be reachable from this state.
    await expect(
      page.getByRole('heading', { name: 'Créer un établissement' }),
    ).toHaveCount(0);
  });

  test('shows an error on bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(`unknown-${Date.now()}@test.example`);
    await page.getByLabel('Mot de passe').fill('something-wrong');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    // The error message text may evolve; we just assert SOMETHING resembling
    // a credential error is shown, and we stay on /login.
    await expect(page.getByText(/(incorrect|invalid|credentials)/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('protected /dashboard redirects to /login when no session', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('GET /forgot-password renders the V1.5 reset request form', async ({ page }) => {
    // V1.5 — make sure the new entry point is reachable + has a working email field.
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /Mot de passe oublié/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /Envoyer le lien/i })).toBeVisible();
  });
});
