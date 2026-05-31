import type { UserRole } from '@/lib/auth/types';

export interface MobileTab {
  /** Route name relative to `app/(app)/` — must match a .tsx file. */
  name: string;
  label: string;
}

const ADMIN_TABS: MobileTab[] = [
  { name: 'dashboard', label: 'Tableau' },
  { name: 'students', label: 'Élèves' },
  { name: 'classes', label: 'Classes' },
  { name: 'pedagogy', label: 'Pédagogie' },
  { name: 'notifications', label: 'Notifs' },
  { name: 'profile', label: 'Profil' },
];

const TEACHER_TABS: MobileTab[] = [
  { name: 'dashboard', label: 'Accueil' },
  { name: 'classes', label: 'Mes classes' },
  { name: 'life', label: 'Vie scolaire' }, // T2b mobile reads (journal + activités)
  { name: 'messages', label: 'Messages' },
  { name: 'notifications', label: 'Notifs' },
  { name: 'profile', label: 'Profil' },
];

const PARENT_TABS: MobileTab[] = [
  { name: 'dashboard', label: 'Accueil' },
  { name: 'students', label: 'Mon enfant' },
  { name: 'life', label: 'Vie scolaire' }, // T2b mobile reads (journal + activités + cantine)
  { name: 'messages', label: 'Messages' },
  { name: 'notifications', label: 'Notifs' },
  { name: 'profile', label: 'Profil' },
];

/** STAFF + SUPER_ADMIN: minimal, role-agnostic set — all screens already exist. */
const MINIMAL_TABS: MobileTab[] = [
  { name: 'dashboard', label: 'Accueil' },
  { name: 'messages', label: 'Messages' },
  { name: 'notifications', label: 'Notifs' },
  { name: 'profile', label: 'Profil' },
];

/**
 * V1.7-A — Resolve the bottom tab bar from the connected user's role at
 * RUNTIME (replaces the build-time EXPO_PUBLIC_PERSONA selection). One binary
 * serves all three personas; tabs always match the role carried by the JWT.
 */
export function getTabsForRole(role: UserRole): MobileTab[] {
  switch (role) {
    case 'SCHOOL_ADMIN':
      return ADMIN_TABS;
    case 'TEACHER':
      return TEACHER_TABS;
    case 'PARENT':
      return PARENT_TABS;
    case 'STAFF':
    case 'SUPER_ADMIN':
    default:
      return MINIMAL_TABS;
  }
}
