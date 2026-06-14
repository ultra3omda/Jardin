import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

import type { UserRole } from '@/lib/auth/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface MobileTab {
  /** Route name relative to `app/(app)/` — must match a .tsx file. */
  name: string;
  label: string;
  /** Ionicons base name (the "-outline" inactive variant). */
  icon: IoniconName;
}

const T = {
  dashboard: { name: 'dashboard', label: 'Accueil', icon: 'home-outline' as IoniconName },
  students: { name: 'students', label: 'Élèves', icon: 'people-outline' as IoniconName },
  child: { name: 'students', label: 'Mon enfant', icon: 'happy-outline' as IoniconName },
  classes: { name: 'classes', label: 'Classes', icon: 'school-outline' as IoniconName },
  pedagogy: { name: 'pedagogy', label: 'Pédagogie', icon: 'book-outline' as IoniconName },
  life: { name: 'life', label: 'Vie scolaire', icon: 'color-palette-outline' as IoniconName },
  messages: { name: 'messages', label: 'Messages', icon: 'chatbubbles-outline' as IoniconName },
  // COMMERCIAL — pipeline des établissements signés (rôle plateforme, sans tenant).
  commercial: { name: 'commercial', label: 'Organisations', icon: 'business-outline' as IoniconName },
  notifications: { name: 'notifications', label: 'Notifs', icon: 'notifications-outline' as IoniconName },
  profile: { name: 'profile', label: 'Profil', icon: 'person-outline' as IoniconName },
} satisfies Record<string, MobileTab>;

// SCHOOL_ADMIN needs messaging too (talk to teachers / parents).
const ADMIN_TABS: MobileTab[] = [T.dashboard, T.students, T.classes, T.pedagogy, T.messages, T.notifications, T.profile];
const TEACHER_TABS: MobileTab[] = [T.dashboard, T.classes, T.life, T.messages, T.notifications, T.profile];
const PARENT_TABS: MobileTab[] = [T.dashboard, T.child, T.life, T.messages, T.notifications, T.profile];
// STAFF has a tenant → can use messaging + notifications.
const STAFF_TABS: MobileTab[] = [T.dashboard, T.messages, T.notifications, T.profile];
// SUPER_ADMIN has NO tenant → tenant-scoped features (messaging) would 403.
// Keep a minimal, safe set.
const SUPER_ADMIN_TABS: MobileTab[] = [T.dashboard, T.notifications, T.profile];
// COMMERCIAL has NO tenant → only platform-level features (org pipeline).
// Tenant-scoped tabs (students, messaging…) would 403, so they are excluded.
const COMMERCIAL_TABS: MobileTab[] = [T.dashboard, T.commercial, T.notifications, T.profile];

/**
 * Resolve the bottom tab bar from the connected user's role at runtime. One
 * binary serves all personas; tabs always match the JWT role.
 */
export function getTabsForRole(role: UserRole): MobileTab[] {
  switch (role) {
    case 'SCHOOL_ADMIN':
      return ADMIN_TABS;
    case 'TEACHER':
      return TEACHER_TABS;
    case 'PARENT':
      return PARENT_TABS;
    case 'SUPER_ADMIN':
      return SUPER_ADMIN_TABS;
    case 'COMMERCIAL':
      return COMMERCIAL_TABS;
    case 'STAFF':
    default:
      return STAFF_TABS;
  }
}

/**
 * Every screen that can appear as a tab for SOME role. The layout registers all
 * of them and hides the ones not in the current role's set (href:null), so the
 * tab bar never shows stray routes.
 */
export const ALL_TAB_NAMES = [
  'dashboard',
  'students',
  'classes',
  'pedagogy',
  'life',
  'messages',
  'commercial',
  'notifications',
  'profile',
] as const;

/**
 * Detail routes that must NEVER appear as tabs. `students` now owns its own
 * Stack ([id] lives inside it), so only the bulletin detail needs hiding here.
 */
export const NON_TAB_ROUTES = ['bulletin', 'manage', 'parent'] as const;
