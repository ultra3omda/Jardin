import type { DemoPersona } from './api/demo-login';

export interface MobilePersona {
  persona: DemoPersona;
  label: string;
  email: string;
  description: string;
}

/**
 * V7-B — 4 demo personas surfaced on the mobile login screen.
 * STAFF + SUPER_ADMIN excluded — those are web-only operators in V7.
 */
export const MOBILE_DEMO_PERSONAS: MobilePersona[] = [
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
    persona: 'parent-kindergarten',
    label: 'Parent maternelle',
    email: 'parent@demo-maternelle.klasso.tn',
    description: "Jardin d'enfants — photos du jour",
  },
];
