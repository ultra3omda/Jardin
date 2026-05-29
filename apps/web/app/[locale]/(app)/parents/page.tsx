'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { StaffCreateForm } from '@/components/crud/staff-form';
import { listParents, createParent, type StaffMutationResult } from '@/lib/api/staff';
import type { CreateStaffValues } from '@/lib/validation/staff.schemas';

const PARENTS_KEY = ['parents', 'list'];

export default function ParentsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(PARENTS_KEY, listParents);
  const parents = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(q));
  }, [parents, search]);

  const createMut = useMutation({
    mutationFn: (values: CreateStaffValues) => createParent(accessToken as string, values),
    onSuccess: (result: StaffMutationResult) => {
      queryClient.invalidateQueries({ queryKey: PARENTS_KEY });
      setCreateOpen(false);
      toast.success('Parent créé.');
      if (result.tempPassword) {
        setTempPassword({ name: `${result.firstName} ${result.lastName}`, password: result.tempPassword });
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Création impossible.'),
  });

  return (
    <>
      <ResourceListPage
        title="Parents"
        description="Comptes parents de votre établissement."
        action={isAdmin ? <Button onClick={() => setCreateOpen(true)}>Ajouter un parent</Button> : undefined}
        isLoading={isLoading}
        isError={isError}
        isEmpty={parents.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les parents."
        emptyTitle="Aucun parent"
        emptyDescription="Créez un compte parent pour relier des élèves à leurs responsables."
        emptyAction={isAdmin ? { label: 'Ajouter un parent', onClick: () => setCreateOpen(true) } : undefined}
        skeletonCols={3}
      >
        <div className="space-y-4">
          <Input
            placeholder="Rechercher un parent…"
            aria-label="Rechercher un parent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun parent ne correspond à « {search} ».</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <div key={p.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <p className="font-semibold text-navy-900">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.email}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Inscrit le {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Ajouter un parent" onClose={() => setCreateOpen(false)}>
        <StaffCreateForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!tempPassword} title="Mot de passe temporaire" onClose={() => setTempPassword(null)}>
        {tempPassword && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Communiquez ce mot de passe temporaire à <strong>{tempPassword.name}</strong>. Il ne sera plus
              affiché.
            </p>
            <code className="block rounded-md bg-slate-100 px-4 py-3 text-center text-lg font-bold text-navy-900">
              {tempPassword.password}
            </code>
            <div className="flex justify-end">
              <Button onClick={() => setTempPassword(null)}>J&apos;ai noté</Button>
            </div>
          </div>
        )}
      </CrudModal>
    </>
  );
}
