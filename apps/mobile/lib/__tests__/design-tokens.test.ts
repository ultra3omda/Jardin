/**
 * Guard test — design system V7 « Médina » token contract (@ecole-saas/shared).
 *
 * Locks the mobile tokens (@klasso/ui-mobile) against the shared contract:
 *  - STRUCTURAL tokens must be IDENTICAL to web. The colors.ts header used to
 *    falsely claim "mirrors web exactly" — this enforces it instead of asserting
 *    it in prose.
 *  - BRAND tokens must stay the DELIBERATE punchier mobile values (locked,
 *    branding non touché): electric coral primary + teal/gold/grape accents.
 *  - The heading font must be Fraunces (was a dead "Cormorant Garamond" ghost).
 *
 * Imports the token files directly (not the package barrel) so Jest never loads
 * the RN component graph.
 */
import { STRUCTURAL_TOKENS, MOBILE_BRAND_TOKENS, BRAND_FONTS } from '@ecole-saas/shared';
import { colors } from '@klasso/ui-mobile/src/tokens/colors';
import { typography } from '@klasso/ui-mobile/src/tokens/typography';

describe('mobile design tokens conform to the shared V7 contract', () => {
  describe('structural tokens (identical to web)', () => {
    it('navy ramp matches the contract', () => {
      expect(colors.navy).toEqual(STRUCTURAL_TOKENS.navy);
    });
    it('ink ramp matches the contract', () => {
      expect(colors.ink).toEqual(STRUCTURAL_TOKENS.ink);
    });
    it('status colors match the contract', () => {
      expect(colors.status).toEqual(STRUCTURAL_TOKENS.status);
    });
    it('surface + paper-100 match the contract', () => {
      expect(colors.surface).toBe(STRUCTURAL_TOKENS.surface);
      expect(colors.paper[100]).toBe(STRUCTURAL_TOKENS.paper100);
    });
  });

  describe('brand tokens (deliberately punchier than web)', () => {
    it('coral (ambre) is the electric mobile primary', () => {
      expect(colors.ambre).toEqual(MOBILE_BRAND_TOKENS.ambre);
      expect(colors.ambre[500]).toBe('#ff4318');
    });
    it('teal / gold / grape accents match the contract', () => {
      expect(colors.teal).toEqual(MOBILE_BRAND_TOKENS.teal);
      expect(colors.gold).toEqual(MOBILE_BRAND_TOKENS.gold);
      expect(colors.grape).toEqual(MOBILE_BRAND_TOKENS.grape);
    });
    it('warm paper-50 + hairline line match the contract', () => {
      expect(colors.paper[50]).toBe(MOBILE_BRAND_TOKENS.paper50);
      expect(colors.line).toBe(MOBILE_BRAND_TOKENS.line);
    });
  });

  describe('typography', () => {
    it('heading font is Fraunces (not the old Cormorant ghost)', () => {
      expect(typography.fontFamilyBrand).toContain(BRAND_FONTS.display); // "Fraunces"
      expect(typography.fontFamilyBrand).not.toMatch(/cormorant/i);
    });
  });
});
