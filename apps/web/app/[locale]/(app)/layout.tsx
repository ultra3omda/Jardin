import type { ReactNode } from 'react';

import { AppShellClient } from './app-shell-client';
import { ErrorBoundary } from '@/components/error-boundary';

/**
 * V1.6 (révisé 2026-05-23 PM) — (app) layout est un Server Component MINCE
 * qui délègue tout au AppShellClient (Client Component).
 *
 * Pourquoi pas Server-side getMeFromCookies (comme avant) :
 * V1.5 refresh-token rotation revoke le cookie A après chaque appel à
 * /api/auth/refresh. Un Server Component ne peut PAS set le cookie B dans
 * le browser (limitation Next.js 14). Conséquence : 1er render server-side
 * OK, 2ème render server-side → 401 → redirect /login → middleware re-
 * redirect /dashboard (cookie A toujours là) → BOUCLE INFINIE.
 *
 * Trade-off accepté :
 * - PRO : pas de boucle, flow auth V1.5 intact
 * - CON : flash bref de thème indigo défaut (~100ms) avant que le client
 *   ne charge user.tenant.brand et inject les CSS vars
 *
 * V11+ pourra reprendre le pattern Server Component après upgrade Next 15
 * (cookies().set() en Server Component) OU après refacto API pour endpoint
 * /auth/verify sans rotation.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShellClient>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShellClient>
  );
}
