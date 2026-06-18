'use client';
import type * as React from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorRetry } from '@/components/ui/error-retry';
import { ApiError } from '@/lib/api/http';
import { createAgent, listAgents, type CommercialAgent } from '@/lib/api/commercial';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface AgentForm {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

const EMPTY: AgentForm = { email: '', firstName: '', lastName: '', password: '' };

export function AgentsClient() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AgentForm>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['commercial', 'agents'],
    queryFn: () => listAgents(accessToken!),
    enabled: !!accessToken,
  });

  const mutation = useMutation({
    mutationFn: (values: AgentForm) => createAgent(accessToken!, values),
    onSuccess: () => {
      setForm(EMPTY);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['commercial', 'agents'] });
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Erreur'),
  });

  const agents: CommercialAgent[] = data ?? [];

  return (
    <div className="space-y-8">
      <form
        className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <Field label="Prénom">
          <input className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
        </Field>
        <Field label="Nom">
          <input className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
        </Field>
        <Field label="Email">
          <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label="Mot de passe initial (≥ 12)">
          <input type="password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={12} />
        </Field>
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Création…' : 'Créer le commercial'}
          </Button>
        </div>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-navy-900">Commerciaux existants</h2>
        {isLoading ? (
          <div className="space-y-2" role="status" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorRetry message="Impossible de charger les commerciaux." onRetry={() => void refetch()} />
        ) : agents.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" aria-hidden="true" />}
            title="Aucun commercial"
            description="Créez un commercial avec le formulaire ci-dessus."
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border bg-card">
            {agents.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">
                  {a.firstName} {a.lastName}
                </span>
                <span className="text-muted-foreground">{a.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const inputClass = 'block w-full rounded-md border bg-background px-3 py-2 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
