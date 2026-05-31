'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { HealthRecordForm } from '@/components/crud/health-record-form';
import {
  listHealthRecords,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  type HealthRecord,
} from '@/lib/api/health';
import type { HealthRecordValues } from '@/lib/validation/health.schemas';

const RECORDS_KEY = ['health-records', 'list'] as const;

function toFormValues(r: HealthRecord): Partial<HealthRecordValues> {
  return {
    studentId: r.studentId,
    bloodType: r.bloodType ?? '',
    allergies: r.allergies ?? '',
    chronicConditions: r.chronicConditions ?? '',
    medications: r.medications ?? '',
    dietaryRestrictions: r.dietaryRestrictions ?? '',
    doctorName: r.doctorName ?? '',
    doctorPhone: r.doctorPhone ?? '',
    emergencyContactName: r.emergencyContactName ?? '',
    emergencyContactPhone: r.emergencyContactPhone ?? '',
    notes: r.notes ?? '',
  };
}

export function HealthRecordsSection({ canManage }: { canManage: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(RECORDS_KEY, listHealthRecords);
  const records = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<HealthRecord | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: RECORDS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: HealthRecordValues) =>
      createHealthRecord(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Dossier créé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: HealthRecordValues }) => {
      const { studentId: _studentId, ...rest } = vars.values;
      void _studentId;
      return updateHealthRecord(requireToken(accessToken), vars.id, rest);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Dossier mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHealthRecord(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Dossier supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Dossiers médicaux"
        description="Un dossier de santé par élève (allergies, traitements, contacts)."
        action={
          canManage ? <Button onClick={() => setCreateOpen(true)}>Nouveau dossier</Button> : undefined
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={records.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les dossiers."
        emptyTitle="Aucun dossier médical"
        emptyDescription="Les dossiers de santé des élèves apparaîtront ici."
        emptyAction={
          canManage ? { label: 'Nouveau dossier', onClick: () => setCreateOpen(true) } : undefined
        }
        skeletonCols={4}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => (
            <div key={r.id} className="space-y-2 rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-navy-900">{r.studentName}</p>
                {r.bloodType && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    {r.bloodType}
                  </span>
                )}
              </div>
              {r.allergies && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-navy-700">Allergies :</span> {r.allergies}
                </p>
              )}
              {r.chronicConditions && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-navy-700">Affections :</span>{' '}
                  {r.chronicConditions}
                </p>
              )}
              {r.medications && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-navy-700">Traitements :</span> {r.medications}
                </p>
              )}
              {r.emergencyContactName && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-navy-700">Urgence :</span>{' '}
                  {r.emergencyContactName}
                  {r.emergencyContactPhone ? ` — ${r.emergencyContactPhone}` : ''}
                </p>
              )}
              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMut.mutate(r.id)}
                    disabled={deleteMut.isPending}
                  >
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Nouveau dossier médical" onClose={() => setCreateOpen(false)}>
        <HealthRecordForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier le dossier" onClose={() => setEditing(null)}>
        {editing && (
          <HealthRecordForm
            key={editing.id}
            defaultValues={toFormValues(editing)}
            hideStudentId
            submitLabel="Enregistrer"
            pending={editMut.isPending}
            onSubmit={(values) => editMut.mutate({ id: editing.id, values })}
            onCancel={() => setEditing(null)}
          />
        )}
      </CrudModal>
    </>
  );
}
