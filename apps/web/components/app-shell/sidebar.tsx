'use client';

import { useState } from 'react';
import { BookOpenText, LogOut, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';

import { getNavForUser } from '@/lib/nav/menu';
import { isItemActive } from '@/lib/nav/active';
import { useAuthStore } from '@/lib/auth/use-auth-store';

import { DomainRail } from './domain-rail';
import { DomainPanel } from './domain-panel';
import { UserPill } from './user-pill';

interface Props {
  onLogout: () => void;
  /** Mobile drawer open state. Ignored on lg+ where the sidebar is static. */
  open?: boolean;
  /** Called to close the mobile drawer (backdrop tap, nav click, close button). */
  onClose?: () => void;
}

export function Sidebar({ onLogout, open = false, onClose }: Props) {
  // All hooks MUST be called unconditionally before any early return.
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const pathname = usePathname() ?? '';

  // Compute sections with a guard so hook order is stable even when user is null.
  const sections = user ? getNavForUser(user, tenant) : [];

  const initialDomain =
    sections.find((s) => s.items.some((it) => isItemActive(pathname, it.href)))?.id ??
    sections[0]?.id ??
    '';

  const [activeDomain, setActiveDomain] = useState(initialDomain);
  const current = sections.find((s) => s.id === activeDomain) ?? sections[0];

  // Early return after all hooks.
  if (!user) return null;

  return (
    <>
      {/* Mobile backdrop — only visible while the drawer is open on < lg */}
      <div
        className={`fixed inset-0 z-40 bg-navy-900/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 z-50 flex h-[100dvh] w-[82vw] max-w-[300px] flex-col bg-navy-900 text-[#c8cdd6] transition-transform duration-300 ease-out lg:static lg:z-auto lg:h-screen lg:w-[260px] lg:max-w-none lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Navigation principale"
      >
        <div className="flex items-center justify-between border-b border-white/5 pr-2">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex flex-1 items-center gap-3 px-5 py-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ambre-500 to-ambre-600 text-white shadow-md">
              <BookOpenText className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-serif text-[17px] font-bold text-white">Klasso</span>
              {tenant && <span className="text-[11px] text-navy-600 truncate">{tenant.name}</span>}
            </span>
          </Link>
          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-[#c8cdd6] hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <DomainRail sections={sections} activeId={activeDomain} onSelect={setActiveDomain} />
          <DomainPanel section={current} onNavigate={onClose} />
        </div>

        <div className="border-t border-white/5 mx-3 my-2 px-2 py-3">
          <UserPill variant="sidebar" />
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center gap-2.5 px-2 py-1.5 text-xs text-[#c8cdd6] hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
