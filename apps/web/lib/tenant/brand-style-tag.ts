import { type TenantBrand, hexToHslTriplet } from '@ecole-saas/shared';

/**
 * V1.6 — Build the inline CSS string injected in <style> to override the
 * shadcn HSL variables for a tenant's brand. Used by both:
 *   - (app)/layout.tsx (post-auth, brand from getMeFromCookies)
 *   - (auth)/t/[slug]/layout.tsx (pre-auth, brand from public endpoint)
 *
 * Security: all 3 input colors must already match /^#[0-9a-f]{6}$/i
 * (server-side guarantee via class-validator UpdateBrandingDto + Zod
 * branding.schemas on web). hexToHslTriplet output is a numeric triplet
 * "H S% L%" with no special characters — XSS-safe inside <style>.
 */
export function buildBrandStyleTag(brand: TenantBrand): string {
  const primary = hexToHslTriplet(brand.primaryColor);
  const primaryHover = hexToHslTriplet(brand.primaryHover);
  const secondary = hexToHslTriplet(brand.secondaryColor);
  return `:root { --primary: ${primary}; --primary-hover: ${primaryHover}; --ring: ${primary}; --secondary: ${secondary}; }`;
}
