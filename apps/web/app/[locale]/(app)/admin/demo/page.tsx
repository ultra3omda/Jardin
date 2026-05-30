'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { useResource } from '@/lib/hooks/use-resource';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useToast } from '@/lib/ui/use-toast';
import {
  DEMO_STATUSES,
  DEMO_STATUS_LABELS,
  listDemoRequests,
  updateDemoStatus,
  type DemoRequestAdmin,
  type DemoStatus,
} from '@/lib/api/admin-demo';

const ADMIN_DEMO_KEY = ['admin', 'demo'] as const;
const ADMIN_OVERVIEW_KEY = ['admin', 'overview'] as const;

function isDemoStatus(value: string): value is DemoStatus {
  return (DEMO_STATUSES as readonly string[]).includes(value);
}

export default function AdminDemoPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const demo = useResource(ADMIN_DEMO_KEY, listDemoRequests);

  const mutation = useMutation({
    mutationFn: (vars: { requestId: string; status: DemoStatus }) =>
      updateDemoStatus(requireToken(accessToken), vars.requestId, { status: vars.status }),
    onSuccess: (record: DemoRequestAdmin) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_DEMO_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY });
      toast.success(`Statut mis à jour : ${DEMO_STATUS_LABELS[record.status]}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Impossible de mettre à jour le statut.'),
  });

  const items = demo.data ?? [];
  const pendingRequestId = mutation.isPending ? mutation.variables?.requestId : undefined;

  return (
    <ResourceListPage
      title="Demandes de démo"
      description="Prospects ayant demandé une démonstration depuis le site public."
      isLoading={demo.isLoading}
      isError={demo.isError}
      isEmpty={items.length === 0}
      onRetry={demo.refetch}
      errorMessage="Impossible de charger les demandes de démo."
      emptyTitle="Aucune demande"
      emptyDescription="Aucune demande de démo n’a encore été reçue."
      skeletonCols={5}
    >
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm" aria-label="Demandes de démo">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
              <th className="px-4 py-3">École</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Effectif</th>
              <th className="px-4 py-3">Reçue le</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((req: DemoRequestAdmin) => (
              <tr key={req.requestId} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium text-navy-900">{req.schoolName}</td>
                <td className="px-4 py-3 text-muted-foreground">{req.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{req.studentsCount ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {new Date(req.receivedAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={req.status}
                    aria-label={`Statut de ${req.schoolName}`}
                    disabled={mutation.isPending && pendingRequestId === req.requestId}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (isDemoStatus(next)) {
                        mutation.mutate({ requestId: req.requestId, status: next });
                      }
                    }}
                    className="rounded-md border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {DEMO_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {DEMO_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResourceListPage>
  );
}
