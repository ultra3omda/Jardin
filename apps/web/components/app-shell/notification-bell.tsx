'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuthStore } from '@/lib/auth/use-auth-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  data?: { href?: string } & Record<string, unknown>;
}

interface NotificationsResponse {
  items: AppNotification[];
  total: number;
}

interface UnreadCountResponse {
  count: number;
}

// ---------------------------------------------------------------------------
// Type colours
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  MESSAGE: '#60a5fa',
  GRADE: '#34d399',
  ATTENDANCE: '#fbb13c',
  INVOICE: '#f87171',
  ANNOUNCEMENT: '#a78bfa',
  SYSTEM: '#94a3b8',
};

function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS.SYSTEM;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useUnreadCount(token: string | null) {
  const [count, setCount] = useState(0);

  const fetch$ = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as UnreadCountResponse;
      setCount(data.count);
    } catch {
      /* silent — badge is non-critical */
    }
  }, [token]);

  useEffect(() => {
    void fetch$();
    const id = setInterval(() => void fetch$(), 30_000);
    return () => clearInterval(id);
  }, [fetch$]);

  return { count, refetch: fetch$ };
}

function useNotificationsList(token: string | null, enabled: boolean) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !token) return;
    setLoading(true);
    fetch('/api/notifications?limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? (r.json() as Promise<NotificationsResponse>) : Promise.reject()))
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [enabled, token]);

  return { items, loading };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const token = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { count, refetch: refetchCount } = useUnreadCount(token);
  const { items, loading } = useNotificationsList(token, open);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  async function markAll() {
    if (!token) return;
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await refetchCount();
  }

  async function markOne(id: string) {
    if (!token) return;
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await refetchCount();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        aria-label={`Notifications${count > 0 ? ` (${count} non lus)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-700 shadow-sm hover:shadow-md transition-shadow"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="dialog"
          aria-label="Centre de notifications"
          className="absolute right-0 top-11 z-50 w-80 rounded-xl bg-white shadow-lg border border-paper-100 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-paper-100">
            <span className="text-[13px] font-semibold text-ink-900">Notifications</span>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => void markAll()}
                  className="text-[11px] text-ambre-600 font-medium hover:underline"
                >
                  Tout marquer comme lu
                </button>
              )}
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                className="text-ink-300 hover:text-ink-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading && (
              <div className="flex flex-col gap-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 items-start animate-pulse">
                    <div className="mt-1 h-2 w-2 rounded-full bg-paper-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-paper-100" />
                      <div className="h-3 w-1/2 rounded bg-paper-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell className="h-8 w-8 text-ink-200 mb-2" aria-hidden="true" />
                <p className="text-[13px] font-medium text-ink-700 mb-1">Aucune notification</p>
                <p className="text-[12px] text-ink-400">Vous êtes à jour !</p>
              </div>
            )}

            {!loading &&
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void markOne(n.id)}
                  className={`w-full text-left flex gap-3 items-start px-4 py-3 hover:bg-paper-50 transition-colors border-b border-paper-50 last:border-0 ${
                    !n.readAt ? 'bg-ambre-50/30' : ''
                  }`}
                >
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: typeColor(n.type) }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] leading-snug mb-0.5 ${
                        !n.readAt ? 'font-semibold text-ink-900' : 'font-medium text-ink-700'
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-[12px] text-ink-400 line-clamp-2 leading-snug">
                      {n.body}
                    </p>
                    <p className="text-[11px] text-ink-300 mt-1">{relativeTime(n.createdAt)}</p>
                  </div>
                </button>
              ))}
          </div>

          {/* Footer */}
          <div className="border-t border-paper-100 px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              className="text-[12px] text-ambre-600 font-medium hover:underline"
              onClick={() => setOpen(false)}
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
