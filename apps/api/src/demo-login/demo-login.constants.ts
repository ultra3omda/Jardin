import type { DemoPersona } from './dto/demo-login.dto';

interface DemoPersonaConfig {
  tenantSlug: string | null;
  email: string;
}

export const DEMO_PERSONA_MAP: Record<DemoPersona, DemoPersonaConfig> = {
  'admin-primary':         { tenantSlug: 'demo-ecole',      email: 'admin@demo-ecole.klasso.tn' },
  'admin-kindergarten':    { tenantSlug: 'demo-maternelle', email: 'admin@demo-maternelle.klasso.tn' },
  'teacher-primary':       { tenantSlug: 'demo-ecole',      email: 'prof@demo-ecole.klasso.tn' },
  'teacher-kindergarten':  { tenantSlug: 'demo-maternelle', email: 'anim@demo-maternelle.klasso.tn' },
  'parent-primary':        { tenantSlug: 'demo-ecole',      email: 'parent@demo-ecole.klasso.tn' },
  'parent-kindergarten':   { tenantSlug: 'demo-maternelle', email: 'parent@demo-maternelle.klasso.tn' },
  'staff':                 { tenantSlug: 'demo-ecole',      email: 'staff@demo-ecole.klasso.tn' },
  'staff-kindergarten':    { tenantSlug: 'demo-maternelle', email: 'staff@demo-maternelle.klasso.tn' },
};
