type Persona = 'parent' | 'teacher' | 'admin';

export interface MobileTab {
  /** Route name relative to `app/(app)/` — must match a .tsx file. */
  name: string;
  label: string;
}

/**
 * V7-E — Resolve the bottom tab bar items per persona.
 * Defaults to `parent` if EXPO_PUBLIC_PERSONA is unset or invalid.
 * All personas include the notifications tab before profile.
 */
export function getMobileTabs(): MobileTab[] {
  const raw = (process.env.EXPO_PUBLIC_PERSONA as string | undefined)?.toLowerCase();
  const persona: Persona = raw === 'teacher' || raw === 'admin' ? raw : 'parent';

  switch (persona) {
    case 'admin':
      return [
        { name: 'dashboard', label: 'Tableau' },
        { name: 'students', label: 'Élèves' },
        { name: 'classes', label: 'Classes' },
        { name: 'pedagogy', label: 'Pédagogie' },
        { name: 'notifications', label: 'Notifs' },
        { name: 'profile', label: 'Profil' },
      ];
    case 'teacher':
      return [
        { name: 'dashboard', label: 'Accueil' },
        { name: 'classes', label: 'Mes classes' },
        { name: 'messages', label: 'Messages' },
        { name: 'notifications', label: 'Notifs' },
        { name: 'profile', label: 'Profil' },
      ];
    case 'parent':
    default:
      return [
        { name: 'dashboard', label: 'Accueil' },
        { name: 'students', label: 'Mon enfant' },
        { name: 'messages', label: 'Messages' },
        { name: 'notifications', label: 'Notifs' },
        { name: 'profile', label: 'Profil' },
      ];
  }
}
