import { expect, test } from '@playwright/test';

/**
 * Messaging page E2E smoke tests.
 *
 * Prerequisites (local):
 *   docker compose up -d
 *   pnpm --filter=@ecole-saas/api prisma migrate deploy
 *   pnpm --filter=@ecole-saas/api dev   # API on :4000
 *   (web auto-starts via playwright.config.ts webServer)
 *
 * Auth strategy: 1-click demo-login as "Direction" (admin-primary / SCHOOL_ADMIN).
 *
 * Resilience: if no conversations exist in the seeded DB, we assert the
 * empty-state is visible rather than failing. The goal is to verify the page
 * loads without crashing, not to assert specific conversation content.
 */

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /Direction/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('conversation list loads without error', async ({ page }) => {
    await page.goto('/messages');

    // Page heading is always rendered by the server component
    await expect(page.getByRole('heading', { name: /Messages/i })).toBeVisible();

    // The page must NOT show an API-level error
    await expect(page.locator('p', { hasText: /^Erreur :/i })).toHaveCount(0);

    // Either the conversation list OR the empty-state card must be visible
    const list = page.locator('ul', { has: page.locator('li') });
    const emptyState = page.getByText(/Aucune conversation pour l'instant/i);

    const hasConversations = (await list.count()) > 0;
    if (hasConversations) {
      await expect(list).toBeVisible();
    } else {
      // Empty-state card must be visible — page should not be blank
      await expect(emptyState).toBeVisible();
    }
  });

  test('clicking a conversation renders the thread without crashing', async ({ page }) => {
    await page.goto('/messages');

    await expect(page.getByRole('heading', { name: /Messages/i })).toBeVisible();

    const firstConversationLink = page.locator('ul li a').first();
    const linkExists = (await firstConversationLink.count()) > 0;

    if (linkExists) {
      await firstConversationLink.click();

      // Should navigate to /messages/[id]
      await expect(page).toHaveURL(/\/messages\/.+/, { timeout: 10_000 });

      // No error state on the thread page
      await expect(page.locator('p', { hasText: /^Erreur :/i })).toHaveCount(0);

      // The page container must be present (no blank render)
      await expect(page.locator('main, [role="main"], .container').first()).toBeVisible();
    } else {
      // No conversations exist — verify the empty state, not a crash
      await expect(page.getByText(/Aucune conversation pour l'instant/i)).toBeVisible();
    }
  });
});
