'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrudModal } from '@/components/crud/crud-modal';
import {
  addParticipation,
  listParticipations,
  removeParticipation,
} from '@/lib/api/activities';
import { listStudents } from '@/lib/api/students';
import { requireToken } from '@/lib/auth/require-token';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useToast } from '@/lib/ui/use-toast';

interface Props {
  activity: { id: string; name: string };
  onClose: () => void;
  onChanged?: () => void;
}

/** Manage the students enrolled in an activity (add / remove). */
export function ManageParticipantsModal({ activity, onClose, onChanged }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');

  const partKey = ['activity-participations', activity.id] as const;
  const partQuery = useQuery({
    queryKey: partKey,
    queryFn: () => listParticipations(requireToken(accessToken), activity.id),
    enabled: !!accessToken,
  });

  const studentsQuery = useQuery({
    queryKey: ['students', 'search', search.trim()],
    queryFn: () => listStudents(requireToken(accessToken), { search: search.trim(), pageSize: 8 }),
    enabled: !!accessToken && search.trim().length >= 2,
  });

  const enrolledIds = useMemo(
    () => new Set((partQuery.data ?? []).map((p) => p.studentId)),
    [partQuery.data],
  );

  const settle = () => {
    void qc.invalidateQueries({ queryKey: partKey });
    onChanged?.();
  };

  const addMut = useMutation({
    mutationFn: (studentId: string) =>
      addParticipation(requireToken(accessToken), activity.id, studentId),
    onSuccess: () => {
      settle();
      toast.success('Élève inscrit.');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Inscription impossible.'),
  });

  const removeMut = useMutation({
    mutationFn: (studentId: string) =>
      removeParticipation(requireToken(accessToken), activity.id, studentId),
    onSuccess: () => {
      settle();
      toast.success('Élève retiré.');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Retrait impossible.'),
  });

  const participants = partQuery.data ?? [];
  const results = (studentsQuery.data?.items ?? []).filter((s) => !enrolledIds.has(s.id));

  return (
    <CrudModal open title={`Participants — ${activity.name}`} onClose={onClose}>
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">
            Élèves inscrits ({participants.length})
          </h3>
          {partQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun élève inscrit.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium text-navy-900">{p.studentName}</span>
                  <button
                    type="button"
                    onClick={() => removeMut.mutate(p.studentId)}
                    disabled={removeMut.isPending}
                    className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">Ajouter un élève</h3>
          <Input
            placeholder="Rechercher un élève (nom)…"
            aria-label="Rechercher un élève"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-2">
            {search.trim().length < 2 ? (
              <p className="text-xs text-muted-foreground">Saisissez au moins 2 caractères.</p>
            ) : studentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Recherche…</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun élève disponible pour « {search} ».</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {results.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium text-navy-900">
                        {s.firstName} {s.lastName}
                      </span>
                      {s.classroom && (
                        <span className="ml-2 text-xs text-muted-foreground">{s.classroom}</span>
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addMut.mutate(s.id)}
                      disabled={addMut.isPending}
                    >
                      Inscrire
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={onClose}>Terminé</Button>
        </div>
      </div>
    </CrudModal>
  );
}
