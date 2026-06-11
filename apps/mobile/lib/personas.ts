import type { DemoPersona } from './api/demo-login';

export interface MobilePersona {
  persona: DemoPersona;
  label: string;
  email: string;
  description: string;
}

/** École primaire (tenant `demo-ecole`) demo personas. */
export const PRIMARY_DEMO_PERSONAS: MobilePersona[] = [
  {
    persona: 'admin-primary',
    label: 'Direction école',
    email: 'admin@demo-ecole.klasso.tn',
    description: 'École primaire — administration',
  },
  {
    persona: 'teacher-primary',
    label: 'Enseignant',
    email: 'prof@demo-ecole.klasso.tn',
    description: 'École primaire — saisie notes',
  },
  {
    persona: 'parent-primary',
    label: 'Parent école',
    email: 'parent@demo-ecole.klasso.tn',
    description: 'École primaire — bulletins enfants',
  },
  {
    persona: 'staff',
    label: 'Staff école',
    email: 'staff@demo-ecole.klasso.tn',
    description: 'École primaire — personnel',
  },
];

/** Jardin d'enfants (tenant `demo-maternelle`) demo personas. */
export const KINDERGARTEN_DEMO_PERSONAS: MobilePersona[] = [
  {
    persona: 'admin-kindergarten',
    label: 'Direction JE',
    email: 'admin@demo-maternelle.klasso.tn',
    description: "Jardin d'enfants — administration",
  },
  {
    persona: 'teacher-kindergarten',
    label: 'Animatrice',
    email: 'anim@demo-maternelle.klasso.tn',
    description: "Jardin d'enfants — vie de classe",
  },
  {
    persona: 'parent-kindergarten',
    label: 'Parent JE',
    email: 'parent@demo-maternelle.klasso.tn',
    description: "Jardin d'enfants — photos du jour",
  },
  {
    persona: 'staff-kindergarten',
    label: 'Staff JE',
    email: 'staff@demo-maternelle.klasso.tn',
    description: "Jardin d'enfants — personnel",
  },
];

/**
 * Pick the demo personas that match the chosen establishment so the kindergarten
 * flow never shows school-only roles (and vice-versa). The kindergarten demo
 * tenant uses the `demo-maternelle` slug; everything else falls back to the
 * primary-school set.
 */
export function getDemoPersonas(tenantSlug: string | null | undefined): MobilePersona[] {
  return tenantSlug === 'demo-maternelle' ? KINDERGARTEN_DEMO_PERSONAS : PRIMARY_DEMO_PERSONAS;
}
