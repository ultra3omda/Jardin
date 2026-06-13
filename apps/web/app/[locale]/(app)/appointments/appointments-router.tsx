'use client';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { AppointmentsClient } from './appointments-client';
import { ParentAppointmentsClient } from './parent-appointments-client';

/**
 * Role-aware entry for /appointments: parents book/see their own appointments,
 * staff/admin/teachers manage types, slots and requests. Branches before any
 * other hook (rules-of-hooks safe) — same pattern as the absences page.
 */
export function AppointmentsRouter() {
  const isParent = useAuthStore((s) => s.user?.role) === 'PARENT';
  return isParent ? <ParentAppointmentsClient /> : <AppointmentsClient />;
}
