type Persona = 'parent' | 'teacher' | 'admin';

export interface MobileTab {
  /** Route name relative to `app/(app)/` — must match a .tsx file. */
  name: string;
  label: string;
}

/**
 * V7-B — Resolve the bottom tab bar items per persona.
 * Defaults to `parent` if EXPO_PUBLIC_PERSONA is unset or invalid.
 */
export function getMobileTabs(): MobileTab[] {
  const raw = (process.env.EXPO_PUBLIC_PERSONA as string | undefined)?.toLowerCase();
  const persona: Persona = raw === 'teacher' || raw === 'admin' ? raw : 'parent';

  switch (persona) {
    case 'admin':
      return [
        { name: 'dashboard', label: 'Tableau' },
        { name: 'students', label: 'Élèves' },
        { name: 'pedagogy', label: 'Pédagogie' },
        { name: 'profile', label: 'Profil' },
      ];
    case 'teacher':
      return [
        { name: 'dashboard', label: 'Accueil' },
        { name: 'students', label: 'Mes classes' },
        { name: 'messages', label: 'Messages' },
        { name: 'profile', label: 'Profil' },
      ];
    case 'parent':
    default:
      return [
        { name: 'dashboard', label: 'Accueil' },
        { name: 'students', label: 'Mon enfant' },
        { name: 'messages', label: 'Messages' },
        { name: 'profile', label: 'Profil' },
      ];
  }
}
