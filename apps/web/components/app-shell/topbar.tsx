'use client';

import { Bell, Search } from 'lucide-react';

import { UserPill } from './user-pill';

interface Props {
  unreadCount?: number;
}

export function Topbar({ unreadCount = 0 }: Props) {
  return (
    <header className="flex items-center gap-4 px-6 py-4 bg-paper-50">
      <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-[13px] text-ink-300 shadow-sm">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>Rechercher une page…</span>
      </div>

      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lus)` : ''}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-700 shadow-sm hover:shadow-md"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <UserPill variant="topbar" />
    </header>
  );
}
