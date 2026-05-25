import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'assets', 'docs',
  'status', 'mail', 'support', 'dashboard',
]);

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(100),
  slug: z
    .string()
    .min(3, 'Slug trop court')
    .max(63, 'Slug trop long')
    .regex(SLUG_REGEX, 'Slug : lettres minuscules, chiffres, tirets uniquement')
    .refine((s) => !RESERVED_SLUGS.has(s), { message: 'Ce slug est réservé' }),
  type: z.enum(['KINDERGARTEN', 'PRIMARY_SCHOOL', 'MIXED']),
  locale: z.enum(['fr', 'en', 'ar', 'es']).default('fr'),
  adminEmail: z.string().email('Email invalide').max(254),
  adminFirstName: z.string().min(1, 'Prénom requis').max(100),
  adminLastName: z.string().min(1, 'Nom requis').max(100),
  primaryColor: z
    .string()
    .regex(HEX_COLOR_REGEX, 'Format hex (ex: #6366f1)')
    .optional()
    .or(z.literal('')),
  sendInviteEmail: z.boolean().default(true),
});

export type CreateTenantFormValues = z.infer<typeof createTenantSchema>;
