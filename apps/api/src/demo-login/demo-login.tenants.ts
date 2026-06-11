import { TenantType, UserRole } from '@prisma/client';
import type { TenantBrand } from '@ecole-saas/shared';

/**
 * V7-C — Hardcoded map of the 2 demo tenants. Used by the self-healing
 * `DemoLoginService.ensureDemoUserSeeded()` flow when the prod DB has not
 * been seeded yet (e.g. fresh Neon Postgres on Railway).
 */
export const DEMO_TENANT_MAP: Record<string, { name: string; type: TenantType }> = {
  'demo-ecole': { name: 'Démo École Pilote', type: TenantType.PRIMARY_SCHOOL },
  'demo-maternelle': { name: 'Démo Jardin Les Pétales', type: TenantType.KINDERGARTEN },
};

/**
 * Distinct white-label brand per demo tenant, so prospects SEE the
 * per-establishment theming (colors + logo) instead of two identical demos.
 * Logos are tiny PNGs served from the web app's public folder.
 * Applied by both `prisma/seed.ts` and the self-healing demo-login upsert.
 */
export const DEMO_TENANT_BRANDS: Record<string, Partial<TenantBrand>> = {
  'demo-ecole': {
    primaryColor: '#02a896', // zellige teal
    primaryHover: '#048275',
    secondaryColor: '#048275',
    emailHeaderColor: '#02a896',
    logoUrl: 'https://ecole-saas.vercel.app/demo/logo-ecole.png',
  },
  'demo-maternelle': {
    primaryColor: '#7a30ff', // playful grape
    primaryHover: '#671bf0',
    secondaryColor: '#5012c4',
    emailHeaderColor: '#7a30ff',
    logoUrl: 'https://ecole-saas.vercel.app/demo/logo-maternelle.png',
  },
};

/**
 * V7-C — Hardcoded firstName/lastName for each demo user email.
 * Mirrors the values used in `apps/api/prisma/seed.ts`.
 */
export const DEMO_USER_NAMES: Record<string, { firstName: string; lastName: string }> = {
  'admin@demo-ecole.klasso.tn': { firstName: 'Amadou', lastName: 'Koné' },
  'prof@demo-ecole.klasso.tn': { firstName: 'Sami', lastName: 'Hadj' },
  'parent@demo-ecole.klasso.tn': { firstName: 'Salma', lastName: 'Ben Ali' },
  'staff@demo-ecole.klasso.tn': { firstName: 'Omar', lastName: 'Mansour' },
  'admin@demo-maternelle.klasso.tn': { firstName: 'Yasmine', lastName: 'Trabelsi' },
  'anim@demo-maternelle.klasso.tn': { firstName: 'Leila', lastName: 'Marzouki' },
  'parent@demo-maternelle.klasso.tn': { firstName: 'Fatma', lastName: 'Zouari' },
  'staff@demo-maternelle.klasso.tn': { firstName: 'Nour', lastName: 'Hamdi' },
  'super@klasso.tn': { firstName: 'Super', lastName: 'Admin' },
};

/**
 * V7-C — Role mapping for each demo persona, used by `ensureDemoUserSeeded()`
 * when creating a fresh user row.
 */
export const DEMO_ROLE_MAP: Record<string, UserRole> = {
  'admin-primary': UserRole.SCHOOL_ADMIN,
  'admin-kindergarten': UserRole.SCHOOL_ADMIN,
  'teacher-primary': UserRole.TEACHER,
  'teacher-kindergarten': UserRole.TEACHER,
  'parent-primary': UserRole.PARENT,
  'parent-kindergarten': UserRole.PARENT,
  staff: UserRole.STAFF,
  'staff-kindergarten': UserRole.STAFF,
};
