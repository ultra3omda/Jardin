'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { useEffect, useMemo, useState } from 'react';

import { listStudents, deleteStudent, type StudentSummary } from '@/lib/api/students';
import { listClasses } from '@/lib/api/classes';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { ErrorRetry } from '@/components/ui/error-retry';
import { BulkActionBar } from '@/components/crud/bulk-action-bar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { toCsv, downloadCsv } from '@/lib/ui/export-csv';
import {
  initSelection,
  toggleStudent,
  selectAllStudents,
  clearSelection,
  isStudentSelected,
  isAllSelected,
  selectionToArray,
  selectionCount,
  type StudentSelection,
} from '@ecole-saas/shared';

const PAGE_SIZE = 25;

function initials(s: StudentSummary): string {
  return `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
}

/** Stable HSL color per id — hash → hue. */
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h}, 60%, 75%)`;
}

export function StudentsList() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role === 'SCHOOL_ADMIN';

  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [classId, setClassId] = useState('');
  const [selection, setSelection] = useState<StudentSelection>(() => initSelection([], 'none'));
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Debounce search 300ms — useEffect (NOT useState) to actually run a cleanup.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1); // reset to page 1 when search changes
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['students', page, debounced, classId],
    queryFn: () =>
      listStudents(accessToken!, {
        page,
        pageSize: PAGE_SIZE,
        search: debounced || undefined,
        classId: classId || undefined,
      }),
    enabled: !!accessToken,
  });

  // Classes for the filter dropdown (admins only).
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'options'],
    queryFn: () => listClasses(accessToken!),
    enabled: !!accessToken && canWrite,
  });
  const classOptions = classesData?.items ?? [];

  const students = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasRows = !isLoading && !isError && students.length > 0;

  const pageIds = useMemo(() => students.map((s) => s.id), [students]);

  // Selection is scoped to the visible page — reset it when page/filters change.
  useEffect(() => {
    setSelection(initSelection([], 'none'));
  }, [page, debounced, classId]);

  const selectedIds = selectionToArray(selection);
  const count = selectionCount(selection);
  const selectedStudents = students.filter((s) => isStudentSelected(selection, s.id));

  const bulkDelete = useMutation({
    mutationFn: async () => {
      await Promise.all(selectedIds.map((id) => deleteStudent(accessToken!, id)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      setSelection(initSelection([], 'none'));
      setConfirmOpen(false);
    },
  });

  function exportCsv(): void {
    const csv = toCsv(selectedStudents, [
      { header: 'Nom', value: (s: StudentSummary) => s.lastName },
      { header: 'Prénom', value: (s: StudentSummary) => s.firstName },
      { header: 'Classe', value: (s: StudentSummary) => s.classroom },
      { header: 'Parent', value: (s: StudentSummary) => s.parentEmail },
      { header: 'Date de naissance', value: (s: StudentSummary) => s.dateOfBirth },
    ]);
    downloadCsv('eleves.csv', csv);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou prénom…"
          className="h-10 w-full max-w-md rounded-md border px-3 text-sm"
          aria-label="Rechercher un élève"
        />
        {canWrite && (
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrer par classe"
            className="h-10 rounded-md border px-3 text-sm"
          >
            <option value="">Toutes les classes</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {canWrite && (
        <BulkActionBar count={count} onClear={() => setSelection(initSelection([], 'none'))}>
          <Button type="button" variant="secondary" size="sm" onClick={exportCsv}>
            Exporter CSV
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            Supprimer
          </Button>
        </BulkActionBar>
      )}

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <ErrorRetry message="Impossible de charger les élèves." onRetry={() => refetch()} />
      ) : students.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {debounced
              ? `Aucun élève ne correspond à « ${debounced} ».`
              : 'Aucun élève enregistré.'}
          </p>
          {canWrite && !debounced && (
            <Link
              href={'/students/new' as Route}
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              {'Créer le premier élève →'}
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full divide-y divide-border" aria-label="Liste des élèves">
            <thead className="bg-muted/50">
              <tr>
                {canWrite && (
                  <th scope="col" className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Tout sélectionner"
                      checked={pageIds.length > 0 && isAllSelected(selection, pageIds)}
                      onChange={(e) =>
                        setSelection(e.target.checked ? selectAllStudents(pageIds) : clearSelection())
                      }
                    />
                  </th>
                )}
                <th scope="col" className="w-12 px-4 py-3">
                  <span className="sr-only">Photo</span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Nom
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Classe
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Parent
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Date de naissance
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  {canWrite && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner ${s.firstName} ${s.lastName}`}
                        checked={isStudentSelected(selection, s.id)}
                        onChange={() => setSelection(toggleStudent(selection, s.id))}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.photoUrl}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-gray-800"
                        style={{ backgroundColor: avatarColor(s.id) }}
                      >
                        {initials(s)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {s.lastName} {s.firstName}
                  </td>
                  <td className="px-4 py-3 text-sm">{s.classroom}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{s.parentEmail}</td>
                  <td className="px-4 py-3 text-sm">{s.dateOfBirth}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/students/${s.id}` as Route}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canWrite && (
        <ConfirmDialog
          open={confirmOpen}
          title={`Supprimer ${count} élève${count > 1 ? 's' : ''} ?`}
          description="Les élèves seront marqués comme supprimés. Les historiques (notes, paiements) sont préservés."
          confirmLabel="Supprimer"
          destructive
          loading={bulkDelete.isPending}
          onConfirm={() => bulkDelete.mutate()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {hasRows && totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted-foreground">
            {total} élèves · page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 rounded-md border px-3 disabled:opacity-50"
            >
              ← Précédent
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-9 rounded-md border px-3 disabled:opacity-50"
            >
              Suivant →
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
