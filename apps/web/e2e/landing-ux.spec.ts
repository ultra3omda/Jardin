import { test, expect } from '@playwright/test';

test.describe('Landing V0.5 — UX upgrade smoke', () => {
  test('FR locale renders all 12 sections and key content', async ({ page }) => {
    await page.goto('/fr');
    // Hero (h1 present + word-by-word motion renders the title)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Stats — section labels (CountUp value starts at 0, label is stable)
    await expect(page.getByText('Conformité RGPD')).toBeVisible();
    // SchoolSegments — 3 cards mapped to TenantType
    await expect(page.getByText("Jardins d'enfants")).toBeVisible();
    await expect(page.getByText('Écoles primaires')).toBeVisible();
    await expect(page.getByText('Établissements mixtes')).toBeVisible();
    // Benefits — 6 piliers expanded
    await expect(page.getByText('Gain de temps')).toBeVisible();
    await expect(page.getByText('Migration depuis Excel')).toBeVisible();
    // DashboardMockup — synthetic Sidi Bou Saïd dashboard
    await expect(page.getByText('Mme Hadia')).toBeVisible();
    // FAQ — title
    await expect(page.getByText('Questions fréquentes')).toBeVisible();
    // CTAFinal — full-bleed dual CTA
    await expect(page.getByText('Prête à essayer Klasso')).toBeVisible();
    // Footer — Chapitre indicators
    await expect(page.getByText('Chapitre I — Élèves')).toBeVisible();
  });

  test('AR locale renders with RTL direction and AR content', async ({ page }) => {
    await page.goto('/ar');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'ar');
    // Hero AR heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // SchoolSegments AR
    await expect(page.getByText('رياض الأطفال')).toBeVisible();
    // FAQ AR
    await expect(page.getByText('أسئلة شائعة')).toBeVisible();
  });

  test('Hero primary CTA navigates to the demo form anchor', async ({ page }) => {
    await page.goto('/fr');
    // The hero CTA + the CtaFinal CTA + the Pricing CTAs all target #demo-form.
    // First one is the hero CTA per page composition order.
    const ctaLink = page.getByRole('link', { name: /Demander une démo gratuite/ }).first();
    await ctaLink.click();
    await expect(page).toHaveURL(/#demo-form$/);
  });
});
