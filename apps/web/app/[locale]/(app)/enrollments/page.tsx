'use client';

import { useMemo, useState } from 'react';

import { listStudents, type StudentSummary } from '@/lib/api/students';
import { useResource } from '@/lib/hooks/use-resource';
import { ErrorRetry } from '@/components/ui/error-retry';

const PAGE_SIZE = 100;

export default function EnrollmentsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const { data, isLoading, isError, refetch } = useResource(
    ['enrollments', PAGE_SIZE],
    (token) => listStudents(token, { pageSize: PAGE_SIZE }),
  );

  const students = useMemo<StudentSummary[]>(() => data?.items ?? [], [data]);

  const classrooms = useMemo(
    () => [...new Set(students.map((s) => s.classroom).filter(Boolean))].sort(),
    [students],
  );
  const filtered = students.filter((s) => {
    const matchSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || s.classroom === filter;
    return matchSearch && matchFilter;
  });
  const active = students.length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Inscriptions</h1>
        <p className="text-sm text-muted-foreground">{active} élèves inscrits</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Rechercher un élève…"
          aria-label="Rechercher un élève"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-md border px-3 py-2 text-sm"
          aria-label="Filtrer par classe"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Toutes les classes</option>
          {classrooms.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : isError ? (
        <ErrorRetry message="Impossible de charger les inscriptions." onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Aucun élève trouvé.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm" aria-label="Liste des inscriptions">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Classe actuelle</th>
                <th className="px-4 py-3">Date inscription</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    {s.lastName} {s.firstName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.classroom || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.enrollmentDate
                      ? new Date(s.enrollmentDate).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
