import { z } from 'zod';

/**
 * V1.6 — Web-side Zod schemas for the branding form.
 * Server-side validation is duplicated via class-validator
 * UpdateBrandingDto on the API — both must agree.
 */

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, 'Format attendu : #RRGGBB');

export const brandingSchema = z.object({
  primaryColor: hex,
  primaryHover: hex,
  secondaryColor: hex,
  emailHeaderColor: hex,
  logoUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
});

export const brandingPatchSchema = brandingSchema.partial();
export type BrandingPatch = z.infer<typeof brandingPatchSchema>;
