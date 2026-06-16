'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Mail } from 'lucide-react';

import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  listInviteTokens,
  revokeInviteToken,
  type InviteToken,
  type InviteTokenStatus,
} from '@/lib/api/admin-invite-tokens';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { CreateInviteModal } from './_components/create-invite-modal';

const ROLE_LABELS: Record<string, string> = {
  SCHOOL_ADMIN: 'Admin école',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  STAFF: 'Personnel',
};

const STATUS_BADGE: Record<InviteTokenStatus, { label: string; className: string }> = {
  consumed: { label: 'Utilisé', className: 'bg-gray-100 text-gray-600' },
  pending: { label: 'Actif', className: 'bg-emerald-100 text-emerald-700' },
  expired: { label: 'Expiré', className: 'bg-rose-100 text-rose-700' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Table of invite tokens for the /admin/invite-tokens page.
 */
export function InviteTokensList() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'invite-tokens'],
    queryFn: () => listInviteTokens(accessToken!),
    enabled: !!accessToken,
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeInviteToken(accessToken!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invite-tokens'] }),
  });

  if (isLoading) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  // On API error (e.g. demo mode without a reachable backend) fall through to
  // the friendly empty state below instead of a red banner over the page.
  const tokens: InviteToken[] = data ?? [];

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Créer une invitation
        </button>
      </div>

      {tokens.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-8 w-8" aria-hidden="true" />}
          title="Aucune invitation"
          description="Créez un token d'invitation pour un nouvel utilisateur."
          action={{ label: 'Créer une invitation', onClick: () => setShowCreateModal(true) }}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rôle
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Créé le
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Expire le
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tokens.map((token) => {
                const badge = STATUS_BADGE[token.status];
                return (
                  <tr key={token.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">
                      {token.invitedEmail ?? 'Toute adresse'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {ROLE_LABELS[token.intendedRole] ?? token.intendedRole}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(token.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(token.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {token.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => revokeMut.mutate(token.id)}
                          disabled={revokeMut.isPending}
                          className="text-sm font-medium text-rose-600 hover:underline disabled:opacity-50"
                          aria-label={`Révoquer l'invitation${token.invitedEmail ? ` de ${token.invitedEmail}` : ''}`}
                        >
                          Révoquer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateInviteModal onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
}
