'use client';

import { Menu, Search } from 'lucide-react';
import { useRouter } from '@/i18n/routing';

import { NotificationBell } from './notification-bell';
import { UserPill } from './user-pill';
import { CommandPalette } from './command-palette';
import { useCommandPalette } from '@/lib/ui/use-command-palette';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { getNavForUser } from '@/lib/nav/menu';
import { navToCommands } from '@/lib/nav/commands';

interface Props {
  /** Opens the mobile navigation drawer. Hamburger is hidden on lg+. */
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: Props) {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const commands = user ? navToCommands(getNavForUser(user, tenant)) : [];

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

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-[13px] text-ink-300 shadow-sm hover:text-ink-500"
        aria-label="Rechercher (Cmd+K)"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Rechercher…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 text-[11px] sm:inline">⌘K</kbd>
      </button>

      <NotificationBell />
      <UserPill variant="topbar" />

      <CommandPalette
        open={open}
        commands={commands}
        onClose={() => setOpen(false)}
        onNavigate={(href) => router.push(href)}
      />
    </header>
  );
}
