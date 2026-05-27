'use client';

import { Search } from 'lucide-react';

import { NotificationBell } from './notification-bell';
import { UserPill } from './user-pill';

export function Topbar() {
  return (
    <header className="flex items-center gap-4 px-6 py-4 bg-paper-50">
      <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-[13px] text-ink-300 shadow-sm">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>Rechercher une page…</span>
      </div>

      <NotificationBell />

      <UserPill variant="topbar" />
    </header>
  );
}
