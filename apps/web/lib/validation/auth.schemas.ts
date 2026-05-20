import { z } from 'zod';

export const LOGIN_PASSWORD_MIN = 1; // login accepts any length; server validates strength
export const REGISTER_PASSWORD_MIN = 12;
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide').max(254),
  password: z.string().min(LOGIN_PASSWORD_MIN, 'Mot de passe requis').max(128),
  tenantSlug: z
    .string()
    .min(3)
    .max(63)
    .regex(SLUG_REGEX, 'Slug invalide')
    .optional()
    .or(z.literal('')),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  tenant: z.object({
    name: z
      .string()
      .min(2, "Nom d'établissement trop court")
      .max(100, "Nom d'établissement trop long"),
    slug: z
      .string()
      .min(3, 'Slug trop court (min. 3 caractères)')
      .max(63, 'Slug trop long')
      .regex(SLUG_REGEX, 'Slug: lettres minuscules, chiffres, tirets uniquement'),
    type: z.enum(['KINDERGARTEN', 'PRIMARY_SCHOOL', 'MIXED']),
  }),
  admin: z.object({
    email: z.string().email('Adresse email invalide').max(254),
    firstName: z.string().min(1, 'Prénom requis').max(100),
    lastName: z.string().min(1, 'Nom requis').max(100),
    password: z
      .string()
      .min(REGISTER_PASSWORD_MIN, `Au moins ${REGISTER_PASSWORD_MIN} caractères requis`)
      .max(128, 'Mot de passe trop long'),
  }),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
