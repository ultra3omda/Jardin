'use client';

import { BookOpenText, LogOut } from 'lucide-react';
import { Link } from '@/i18n/routing';

import { getNavForUser } from '@/lib/nav/menu';
import { useAuthStore } from '@/lib/auth/use-auth-store';

import { NavSection } from './nav-section';
import { UserPill } from './user-pill';

interface Props {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: Props) {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  if (!user) return null;

  const sections = getNavForUser(user, tenant);

  return (
    <aside className="flex h-screen w-[260px] flex-col bg-navy-900 text-[#c8cdd6]">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ambre-500 to-ambre-600 text-white shadow-md">
          <BookOpenText className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-serif text-[17px] font-bold text-white">Klasso</span>
          {tenant && <span className="text-[11px] text-navy-600 truncate">{tenant.name}</span>}
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <NavSection key={section.id} section={section} />
        ))}
      </nav>

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
  );
}
