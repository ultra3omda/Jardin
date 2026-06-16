'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';

import { Link } from '@/i18n/routing';
import { listConversations } from '@/lib/api/messaging';
import { otherParticipant, formatConversationPreview } from '@/lib/messaging/conversation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorRetry } from '@/components/ui/error-retry';

function ConversationSkeleton() {
  return (
    <div
      className="divide-y divide-border overflow-hidden rounded-lg border bg-card"
      role="status"
      aria-busy="true"
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-10 w-10 flex-none rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessagesList() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['messaging', 'conversations'],
    queryFn: () => listConversations(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: true,
  });

  if (!accessToken || !currentUser) {
    return <p className="text-sm text-muted-foreground">Authentification requise.</p>;
  }
  if (isLoading) return <ConversationSkeleton />;
  if (isError) {
    return (
      <ErrorRetry message="Impossible de charger les conversations." onRetry={() => void refetch()} />
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-8 w-8" aria-hidden="true" />}
        title="Aucune conversation"
        description="Démarrez une conversation depuis la fiche d'un parent ou d'un élève."
      />
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
                  {formatConversationPreview(c, currentUser.id)}
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
