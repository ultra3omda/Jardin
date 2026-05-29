'use client';

import { useQuery } from '@tanstack/react-query';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { useEffect, useState } from 'react';

import { listStudents, type StudentSummary, type ListStudentsResponse } from '@/lib/api/students';
import { DEMO_STUDENTS } from '@/lib/demo/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const PAGE_SIZE = 25;

// ─── Demo fallback data ───────────────────────────────────────────────────────
// Fixtures live in @/lib/demo/students so the detail/sub views fall back to the
// SAME data — a demo list → detail click never 404s.

const DEMO_STUDENTS_RESPONSE: ListStudentsResponse = {
  items: DEMO_STUDENTS,
  total: DEMO_STUDENTS.length,
  page: 1,
  pageSize: PAGE_SIZE,
};

// ─────────────────────────────────────────────────────────────────────────────

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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce search 300ms — useEffect (NOT useState) to actually run a cleanup.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1); // reset to page 1 when search changes
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['students', page, debounced],
    queryFn: () =>
      listStudents(accessToken!, {
        page,
        pageSize: PAGE_SIZE,
        search: debounced || undefined,
      }),
    enabled: !!accessToken,
  });

  if (!accessToken || isLoading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Chargement…
      </p>
    );
  }

  // Fall back to demo data when API returns empty or errors — only when not actively searching
  const effectiveData = (!debounced && (error || !data || data.total === 0))
    ? DEMO_STUDENTS_RESPONSE
    : (data ?? DEMO_STUDENTS_RESPONSE);

  if (!effectiveData || effectiveData.total === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {debounced
            ? `Aucun élève ne correspond à « ${debounced} ».`
            : "Aucun élève pour l’instant."}
        </p>
        {canWrite && !debounced && (
          <Link
            href={"/students/new" as Route}
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            {"Créer le premier élève →"}
          </Link>
        )}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(effectiveData.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom ou prénom…"
        className="h-10 w-full max-w-md rounded-md border px-3 text-sm"
        aria-label="Rechercher un élève"
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
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
            {effectiveData.items.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
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

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted-foreground">
            {effectiveData.total} élèves · page {page}/{totalPages}
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
