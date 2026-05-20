import { expect, test } from '@playwright/test';

/**
 * Auth e2e flow against the live web + API + Postgres.
 *
 * Prerequisites (local):
 *   docker compose up -d
 *   pnpm --filter=@ecole-saas/api prisma migrate dev
 *   pnpm --filter=@ecole-saas/api dev   # API on :4000
 *   (web auto-starts via playwright.config.ts webServer)
 */

const SUFFIX = Date.now().toString(36);
const slug = `e2e-${SUFFIX}`;
const email = `e2e-admin-${SUFFIX}@test.example`;
const password = 'TestPlaywright1234!';

test.describe('Auth flow', () => {
  test('register -> dashboard -> logout -> login', async ({ page }) => {
    // ----- Register -----
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Créer un établissement' })).toBeVisible();

    await page.getByLabel("Nom de l'établissement").fill(`E2E School ${SUFFIX}`);
    await page.getByLabel('Slug').fill(slug);
    await page.getByLabel("Type d'établissement").selectOption('KINDERGARTEN');
    await page.getByLabel('Prénom').fill('E2E');
    await page.getByLabel('Nom', { exact: true }).fill('Admin');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe').fill(password);

    await page.getByRole('button', { name: "Créer l'établissement" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Bienvenue, E2E/ })).toBeVisible();
    await expect(page.getByText(`E2E School ${SUFFIX}`).first()).toBeVisible();

    // ----- Logout -----
    await page.getByRole('button', { name: 'Déconnexion' }).click();
    await expect(page).toHaveURL(/\/login$/);

    // ----- Login -----
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Bienvenue, E2E/ })).toBeVisible();
  });

  test('shows an error on bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(`unknown-${Date.now()}@test.example`);
    await page.getByLabel('Mot de passe').fill('something-wrong');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText(/Email ou mot de passe incorrect/)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('protected /dashboard redirects to /login when no session', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
