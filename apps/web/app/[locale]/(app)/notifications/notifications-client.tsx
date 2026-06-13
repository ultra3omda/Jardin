'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/lib/auth/use-auth-store';

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
  unreadCount: number;
}

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

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

const PAGE_SIZE = 20;

export function NotificationsClient() {
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/notifications?limit=${limit}&unreadOnly=${unreadOnly}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('request failed');
      const data = (await res.json()) as NotificationsResponse;
      setItems(data.items);
      setTotal(data.total);
      setUnread(data.unreadCount);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, limit, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAll() {
    if (!token) return;
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  }

  async function openNotification(n: AppNotification) {
    if (token && !n.readAt) {
      await fetch(`/api/notifications/${n.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    const href = n.data?.href;
    if (href) {
      router.push(href);
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filtre"
          className="inline-flex rounded-md border p-0.5 text-sm"
        >
          <button
            type="button"
            onClick={() => setUnreadOnly(false)}
            aria-pressed={!unreadOnly}
            className={`rounded px-3 py-1.5 font-medium ${
              !unreadOnly ? 'bg-navy-700 text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Toutes
          </button>
          <button
            type="button"
            onClick={() => setUnreadOnly(true)}
            aria-pressed={unreadOnly}
            className={`rounded px-3 py-1.5 font-medium ${
              unreadOnly ? 'bg-navy-700 text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Non lues{unread > 0 ? ` (${unread})` : ''}
          </button>
        </div>

        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markAll()}
            className="h-9 rounded-md border px-3 text-sm font-medium hover:bg-muted"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2" role="status" aria-label="Chargement des notifications">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger les notifications.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
          <Bell className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">
            {unreadOnly ? 'Aucune notification non lue.' : 'Aucune notification.'}
          </p>
          <p className="text-xs text-muted-foreground">Vous êtes à jour !</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void openNotification(n)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 ${
                  !n.readAt ? 'bg-ambre-50/30' : ''
                }`}
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: typeColor(n.type) }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm leading-snug ${
                      !n.readAt ? 'font-semibold' : 'font-medium text-muted-foreground'
                    }`}
                  >
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                  <span className="mt-1 block text-xs text-muted-foreground/70">
                    {relativeTime(n.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Load more */}
      {!loading && !error && items.length < total && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted"
          >
            Charger plus ({items.length}/{total})
          </button>
        </div>
      )}
    </div>
  );
}
