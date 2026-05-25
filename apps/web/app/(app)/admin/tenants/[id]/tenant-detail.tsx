'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  getTenant,
  resendInvite,
  type InviteSummary,
} from '@/lib/api/admin-tenants';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export function TenantDetail({ id }: { id: string }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [resentInvite, setResentInvite] = useState<InviteSummary | null>(null);

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['admin', 'tenant', id],
    queryFn: () => getTenant(accessToken!, id),
    enabled: !!accessToken,
  });

  const resendMutation = useMutation({
    mutationFn: () => resendInvite(accessToken!, id),
    onSuccess: (invite) => {
      setResentInvite(invite);
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', id] });
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (error) return <p className="text-sm text-rose-600">Erreur : {(error as Error).message}</p>;
  if (!tenant) return null;

  const webUrl = `https://ecole-saas.vercel.app/t/${tenant.slug}/login`;
  const mobileUrl = 'https://klasso-mobile.vercel.app';
  const canResend = tenant.inviteStatus !== 'consumed' && !tenant.adminOnboarded;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/tenants" className="text-sm text-muted-foreground hover:underline">
          ← Toutes les écoles
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{tenant.name}</h1>
        <p className="font-mono text-sm text-muted-foreground">{tenant.slug}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Type" value={tenant.type} />
        <Stat label="Langue" value={tenant.locale.toUpperCase()} />
        <Stat label="Utilisateurs" value={String(tenant.usersCount)} />
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold">URLs preview</h2>
        <UrlRow label="Web" url={webUrl} />
        <UrlRow label="Mobile" url={mobileUrl} note={`Code école : ${tenant.slug}`} />
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold">Statut admin</h2>
        <p className="text-sm">
          {tenant.adminOnboarded ? (
            <span className="text-emerald-700">✓ Admin actif</span>
          ) : tenant.inviteStatus === 'pending' ? (
            <span className="text-amber-700">⏳ Invitation en attente</span>
          ) : tenant.inviteStatus === 'expired' ? (
            <span className="text-rose-700">⚠ Invitation expirée</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </p>
        {canResend && (
          <Button
            variant="outline"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
          >
            {resendMutation.isPending ? 'Envoi...' : "Renvoyer l'invitation"}
          </Button>
        )}
        {resentInvite && (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs">
            <p>✓ Nouvel email envoyé. Lien :</p>
            <code className="mt-1 block break-all">{resentInvite.url}</code>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function UrlRow({ label, url, note }: { label: string; url: string; note?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{url}</code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(url)}
          className="rounded border px-2 py-1 text-xs hover:bg-muted"
        >
          Copier
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="rounded border px-2 py-1 text-xs hover:bg-muted">
          Ouvrir ↗
        </a>
      </div>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
