'use client';

import { useAuthStore } from '@/lib/auth/use-auth-store';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:  'Super-admin',
  SCHOOL_ADMIN: 'Admin',
  TEACHER:      'Enseignant',
  PARENT:       'Parent',
  STAFF:        'Personnel',
};

interface Props {
  variant: 'sidebar' | 'topbar';
}

export function UserPill({ variant }: Props) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  if (variant === 'sidebar') {
    return (
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ambre-500 to-ambre-600 text-xs font-bold text-white">
          {initials}
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold text-white">
            {user.firstName} {user.lastName}
          </span>
          <span className="block text-[11px] text-navy-600">{roleLabel}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-full bg-surface px-3 py-1.5 shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ambre-500 to-ambre-600 text-xs font-bold text-white">
        {initials}
      </span>
      <span className="leading-tight">
        <span className="block text-[13px] font-semibold text-ink-900">
          {user.firstName} {user.lastName}
        </span>
        <span className="block text-[11px] text-ink-500">{roleLabel}</span>
      </span>
    </div>
  );
}
