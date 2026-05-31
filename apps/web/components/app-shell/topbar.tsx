'use client';

import { Menu, Search } from 'lucide-react';

import { NotificationBell } from './notification-bell';
import { UserPill } from './user-pill';

interface Props {
  /** Opens the mobile navigation drawer. Hamburger is hidden on lg+. */
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: Props) {
  return (
    <header className="flex items-center gap-2 px-4 py-4 bg-paper-50 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-500 shadow-sm hover:text-ink-900 lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-[13px] text-ink-300 shadow-sm">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Rechercher une page…</span>
      </div>

      <NotificationBell />

      <UserPill variant="topbar" />
    </header>
  );
}
