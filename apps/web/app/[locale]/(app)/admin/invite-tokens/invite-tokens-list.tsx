'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  listInviteTokens,
  revokeInviteToken,
  type InviteToken,
} from '@/lib/api/admin-invite-tokens';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { CreateInviteModal } from './_components/create-invite-modal';

const ROLE_LABELS: Record<string, string> = {
  SCHOOL_ADMIN: 'Admin école',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  STAFF: 'Personnel',
};

type TokenStatus = 'used' | 'active' | 'expired';

function getStatus(token: InviteToken): TokenStatus {
  if (token.usedAt) return 'used';
  if (new Date(token.expiresAt) < new Date()) return 'expired';
  return 'active';
}

const STATUS_BADGE: Record<TokenStatus, { label: string; className: string }> = {
  used: { label: 'Utilisé', className: 'bg-gray-100 text-gray-600' },
  active: { label: 'Actif', className: 'bg-emerald-100 text-emerald-700' },
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'invite-tokens'],
    queryFn: () => listInviteTokens(accessToken!),
    enabled: !!accessToken,
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeInviteToken(accessToken!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invite-tokens'] }),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-rose-600" role="alert">
        Erreur : {(error as Error).message}
      </p>
    );
  }

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
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucun token d&apos;invitation.</p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Créer le premier →
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
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
                const status = getStatus(token);
                const badge = STATUS_BADGE[status];
                return (
                  <tr key={token.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{token.email}</td>
                    <td className="px-4 py-3 text-sm">
                      {ROLE_LABELS[token.role] ?? token.role}
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
                      {status === 'active' && (
                        <button
                          type="button"
                          onClick={() => revokeMut.mutate(token.id)}
                          disabled={revokeMut.isPending}
                          className="text-sm font-medium text-rose-600 hover:underline disabled:opacity-50"
                          aria-label={`Révoquer l'invitation de ${token.email}`}
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
