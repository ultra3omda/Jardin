'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CrudModal } from '@/components/crud/crud-modal';
import { listSubjects, listTeacherSubjects, setTeacherSubjects } from '@/lib/api/subjects';
import { requireToken } from '@/lib/auth/require-token';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useToast } from '@/lib/ui/use-toast';

interface Props {
  teacher: { id: string; firstName: string; lastName: string };
  onClose: () => void;
}

/** Assign which subjects a teacher is qualified to teach (full-set replace). */
export function ManageSubjectsModal({ teacher, onClose }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'options'],
    queryFn: () => listSubjects(requireToken(accessToken)),
    enabled: !!accessToken,
  });

  const currentQuery = useQuery({
    queryKey: ['teacher-subjects', teacher.id],
    queryFn: () => listTeacherSubjects(requireToken(accessToken), teacher.id),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (currentQuery.data) {
      setSelected(new Set(currentQuery.data.items.map((i) => i.subjectId)));
    }
  }, [currentQuery.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      setTeacherSubjects(requireToken(accessToken), teacher.id, [...selected]),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teacher-subjects', teacher.id] });
      toast.success('Matières enregistrées.');
      onClose();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.'),
  });

  const subjects = subjectsQuery.data?.items ?? [];
  const loading = subjectsQuery.isLoading || currentQuery.isLoading;

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <CrudModal
      open
      title={`Matières — ${teacher.firstName} ${teacher.lastName}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cochez les matières que cet enseignant est habilité à enseigner.
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune matière définie. Créez des matières dans Paramètres → Matières.
          </p>
        ) : (
          <ul className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
            {subjects.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="rounded border"
                  />
                  <span>
                    {s.emoji ? `${s.emoji} ` : ''}
                    {s.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saveMut.isPending}>
            Annuler
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || loading}>
            {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </CrudModal>
  );
}
