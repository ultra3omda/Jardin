'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { PayslipGenerateForm } from '@/components/crud/payslip-generate-form';
import { PayslipComponentForm } from '@/components/crud/payslip-component-form';
import type { EmployeeOption } from '@/components/crud/employment-contract-form';
import { listStaff, listTeachers } from '@/lib/api/staff';
import {
  listPayslips,
  generatePayslip,
  addPayslipComponent,
  deletePayslipComponent,
  issuePayslip,
  deletePayslip,
  type Payslip,
} from '@/lib/api/hr';
import type { GeneratePayslipValues, PayslipComponentValues } from '@/lib/validation/hr.schemas';

const PAYSLIPS_KEY = ['hr', 'payslips', 'list'] as const;
const EMPLOYEES_KEY = ['hr', 'employees', 'picker'] as const;

const money = (v: string, currency: string) => `${Number(v).toLocaleString('fr-FR')} ${currency}`;

export function PayrollSection() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(PAYSLIPS_KEY, listPayslips);
  const payslips = data?.items ?? [];

  const { data: employeesData } = useQuery({
    queryKey: EMPLOYEES_KEY,
    enabled: !!accessToken,
    queryFn: async () => {
      const token = requireToken(accessToken);
      const [teachers, staff] = await Promise.all([listTeachers(token), listStaff(token)]);
      return [...teachers.items, ...staff.items];
    },
  });
  const employees: EmployeeOption[] = useMemo(
    () =>
      (employeesData ?? [])
        .map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName} (${e.email})` }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    [employeesData],
  );
  const employeeName = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employeesData ?? []) map.set(e.id, `${e.firstName} ${e.lastName}`);
    return map;
  }, [employeesData]);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = payslips.find((p) => p.id === detailId) ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PAYSLIPS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const generateMut = useMutation({
    mutationFn: (values: GeneratePayslipValues) =>
      generatePayslip(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setGenerateOpen(false);
      toast.success('Bulletin généré.');
    },
    onError: (err) => toast.error(errMsg(err, 'Génération impossible.')),
  });

  const addComponentMut = useMutation({
    mutationFn: (vars: { id: string; values: PayslipComponentValues }) =>
      addPayslipComponent(requireToken(accessToken), vars.id, vars.values),
    onSuccess: () => {
      invalidate();
      toast.success('Composant ajouté.');
    },
    onError: (err) => toast.error(errMsg(err, 'Ajout impossible.')),
  });

  const removeComponentMut = useMutation({
    mutationFn: (vars: { id: string; componentId: string }) =>
      deletePayslipComponent(requireToken(accessToken), vars.id, vars.componentId),
    onSuccess: () => {
      invalidate();
      toast.success('Composant supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  const issueMut = useMutation({
    mutationFn: (id: string) => issuePayslip(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Bulletin émis.');
    },
    onError: (err) => toast.error(errMsg(err, 'Émission impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePayslip(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      setDetailId(null);
      toast.success('Bulletin supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Paie"
        description="Bulletins de paie générés à partir des contrats."
        action={
          <Button onClick={() => setGenerateOpen(true)} disabled={employees.length === 0}>
            Générer un bulletin
          </Button>
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={payslips.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les bulletins."
        emptyTitle="Aucun bulletin"
        emptyDescription="Générez le premier bulletin de paie d'un employé."
        emptyAction={{ label: 'Générer un bulletin', onClick: () => setGenerateOpen(true) }}
        skeletonCols={6}
      >
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Employé</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Brut</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{employeeName.get(p.userId) ?? p.userId}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.period}</td>
                  <td className="px-4 py-3 font-mono">{money(p.grossSalary, p.currency)}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{money(p.netSalary, p.currency)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === 'ISSUED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.status === 'ISSUED' ? 'Émis' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => setDetailId(p.id)}>
                      Détail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={generateOpen} title="Générer un bulletin" onClose={() => setGenerateOpen(false)}>
        <PayslipGenerateForm
          employees={employees}
          pending={generateMut.isPending}
          onSubmit={(values) => generateMut.mutate(values)}
          onCancel={() => setGenerateOpen(false)}
        />
      </CrudModal>

      <CrudModal
        open={!!detail}
        title={detail ? `Bulletin ${detail.period}` : 'Bulletin'}
        onClose={() => setDetailId(null)}
      >
        {detail && (
          <PayslipDetail
            payslip={detail}
            employeeName={employeeName.get(detail.userId) ?? detail.userId}
            addPending={addComponentMut.isPending}
            onAddComponent={(values) => addComponentMut.mutate({ id: detail.id, values })}
            onRemoveComponent={(componentId) =>
              removeComponentMut.mutate({ id: detail.id, componentId })
            }
            onIssue={() => issueMut.mutate(detail.id)}
            onDelete={() => deleteMut.mutate(detail.id)}
            mutating={
              issueMut.isPending || deleteMut.isPending || removeComponentMut.isPending
            }
          />
        )}
      </CrudModal>
    </>
  );
}

interface PayslipDetailProps {
  payslip: Payslip;
  employeeName: string;
  addPending: boolean;
  onAddComponent: (values: PayslipComponentValues) => void;
  onRemoveComponent: (componentId: string) => void;
  onIssue: () => void;
  onDelete: () => void;
  mutating: boolean;
}

function PayslipDetail({
  payslip,
  employeeName,
  addPending,
  onAddComponent,
  onRemoveComponent,
  onIssue,
  onDelete,
  mutating,
}: PayslipDetailProps) {
  const isDraft = payslip.status === 'DRAFT';
  const fmt = (v: string) => `${Number(v).toLocaleString('fr-FR')} ${payslip.currency}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy-900">{employeeName}</p>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            payslip.status === 'ISSUED' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {payslip.status === 'ISSUED' ? 'Émis' : 'Brouillon'}
        </span>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b">
              <td className="px-3 py-2 text-muted-foreground">Salaire de base</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(payslip.baseSalary)}</td>
              <td />
            </tr>
            {payslip.components.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-3 py-2">
                  {c.label}{' '}
                  <span className="text-xs text-muted-foreground">
                    ({c.kind === 'EARNING' ? 'gain' : 'retenue'})
                  </span>
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono ${
                    c.kind === 'DEDUCTION' ? 'text-red-700' : 'text-green-700'
                  }`}
                >
                  {c.kind === 'DEDUCTION' ? '−' : '+'}
                  {fmt(c.amount)}
                </td>
                <td className="px-3 py-2 text-right">
                  {isDraft && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      onClick={() => onRemoveComponent(c.id)}
                      disabled={mutating}
                    >
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-b">
              <td className="px-3 py-2 font-medium">Brut</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(payslip.grossSalary)}</td>
              <td />
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 font-medium">Retenues</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(payslip.totalDeductions)}</td>
              <td />
            </tr>
            <tr>
              <td className="px-3 py-2 font-bold text-navy-900">Net à payer</td>
              <td className="px-3 py-2 text-right font-mono font-bold text-navy-900">
                {fmt(payslip.netSalary)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {isDraft && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ajouter un gain / une retenue
          </p>
          <PayslipComponentForm pending={addPending} onSubmit={onAddComponent} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {isDraft && (
          <Button variant="outline" onClick={onDelete} disabled={mutating}>
            Supprimer
          </Button>
        )}
        {isDraft && (
          <Button onClick={onIssue} disabled={mutating}>
            Émettre
          </Button>
        )}
      </div>
    </div>
  );
}
