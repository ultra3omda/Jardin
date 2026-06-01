'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrudModal } from '@/components/crud/crud-modal';
import {
  createParentRelation,
  deleteParentRelation,
  listParentRelations,
  type RelationType,
} from '@/lib/api/parent-relations';
import { listStudents } from '@/lib/api/students';
import { requireToken } from '@/lib/auth/require-token';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useToast } from '@/lib/ui/use-toast';

interface Props {
  parent: { id: string; firstName: string; lastName: string };
  onClose: () => void;
}

const RELATIONS: { value: RelationType; label: string }[] = [
  { value: 'MOTHER', label: 'Mère' },
  { value: 'FATHER', label: 'Père' },
  { value: 'LEGAL_GUARDIAN', label: 'Tuteur légal' },
  { value: 'OTHER', label: 'Autre' },
];

/**
 * Admin tool to assign one or more children to a parent (and unlink them).
 * Mirror of the student-side LinkParentModal, from the parent's perspective.
 */
export function ManageChildrenModal({ parent, onClose }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const toast = useToast();

  const relationsKey = ['parent-relations', { parentUserId: parent.id }] as const;
  const [search, setSearch] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('MOTHER');

  const relationsQuery = useQuery({
    queryKey: relationsKey,
    queryFn: () => listParentRelations(requireToken(accessToken), { parentUserId: parent.id }),
    enabled: !!accessToken,
  });

  // Search students to link (only fired once the user types ≥ 2 chars).
  const studentsQuery = useQuery({
    queryKey: ['students', 'search', search.trim()],
    queryFn: () => listStudents(requireToken(accessToken), { search: search.trim(), pageSize: 8 }),
    enabled: !!accessToken && search.trim().length >= 2,
  });

  const linkedIds = useMemo(
    () => new Set((relationsQuery.data?.items ?? []).map((r) => r.studentId)),
    [relationsQuery.data],
  );

  const addMut = useMutation({
    mutationFn: (studentId: string) =>
      createParentRelation(requireToken(accessToken), {
        parentUserId: parent.id,
        studentId,
        relationType,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: relationsKey });
      toast.success('Enfant rattaché.');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Rattachement impossible.'),
  });

  const removeMut = useMutation({
    mutationFn: (relationId: string) => deleteParentRelation(requireToken(accessToken), relationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: relationsKey });
      toast.success('Enfant détaché.');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Détachement impossible.'),
  });

  const relations = relationsQuery.data?.items ?? [];
  const results = (studentsQuery.data?.items ?? []).filter((s) => !linkedIds.has(s.id));

  return (
    <CrudModal
      open
      title={`Enfants de ${parent.firstName} ${parent.lastName}`}
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Currently linked children */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">Enfants rattachés</h3>
          {relationsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : relations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun enfant rattaché pour l’instant.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {relations.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-navy-900">
                      {r.student ? `${r.student.firstName} ${r.student.lastName}` : 'Élève'}
                    </span>
                    {r.student?.classroom && (
                      <span className="ml-2 text-xs text-muted-foreground">{r.student.classroom}</span>
                    )}
                    <span className="ml-2 text-xs text-muted-foreground">
                      · {RELATIONS.find((x) => x.value === r.relationType)?.label ?? r.relationType}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMut.mutate(r.id)}
                    disabled={removeMut.isPending}
                    className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                  >
                    Détacher
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Add a child */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">Ajouter un enfant</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Rechercher un élève (nom)…"
              aria-label="Rechercher un élève"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              aria-label="Lien de parenté"
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as RelationType)}
              className="h-10 rounded-md border bg-white px-3 text-sm"
            >
              {RELATIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

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
                      Ajouter
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
