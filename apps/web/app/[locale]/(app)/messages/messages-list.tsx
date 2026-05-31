'use client';

import { useQuery } from '@tanstack/react-query';

import { Link } from '@/i18n/routing';
import { listConversations, type Conversation } from '@/lib/api/messaging';
import { useAuthStore } from '@/lib/auth/use-auth-store';

function otherParticipant(c: Conversation, currentUserId: string) {
  return c.participants.find((p) => p.userId !== currentUserId);
}

function formatPreview(c: Conversation, currentUserId: string): string {
  if (!c.lastMessage) return 'Conversation ouverte. Aucun message encore.';
  const prefix = c.lastMessage.senderId === currentUserId ? 'Vous : ' : '';
  const body =
    c.lastMessage.body.length > 80 ? `${c.lastMessage.body.slice(0, 77)}…` : c.lastMessage.body;
  return `${prefix}${body}`;
}

export function MessagesList() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['messaging', 'conversations'],
    queryFn: () => listConversations(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: true,
  });

  if (!accessToken || !currentUser) {
    return <p className="text-sm text-muted-foreground">Authentification requise.</p>;
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucune conversation pour l&apos;instant.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Démarrez une conversation depuis la fiche d&apos;un parent ou d&apos;un élève.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border bg-card">
      {items.map((c) => {
        const other = otherParticipant(c, currentUser.id);
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}` as never}
              className="flex items-start gap-4 px-4 py-4 transition hover:bg-muted/40"
            >
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {(other?.firstName?.[0] ?? '?').toUpperCase()}
                {(other?.lastName?.[0] ?? '').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium">
                    {other ? `${other.firstName} ${other.lastName}` : 'Conversation'}
                  </p>
                  <span className="flex-none text-xs text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {formatPreview(c, currentUser.id)}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="ms-auto flex-none rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {c.unreadCount}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
