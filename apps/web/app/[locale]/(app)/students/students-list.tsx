'use client';

import { useQuery } from '@tanstack/react-query';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { useEffect, useState } from 'react';

import { listStudents, type StudentSummary, type ListStudentsResponse } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const PAGE_SIZE = 25;

// ─── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_STUDENTS: StudentSummary[] = [
  { id: 'ds-1-1', tenantId: 'demo', firstName: 'Léa', lastName: 'Fontaine', dateOfBirth: '2018-03-15', sex: 'F', nationality: 'TN', classroom: 'CP-A', enrollmentDate: '2024-09-02', previousSchooling: null, parentEmail: 'sfontaine@parent.demo', siblingsCount: 1, addressLine: '12 rue des Lilas', city: 'Tunis', postalCode: '1000', country: 'TN', motherTongue: 'Arabe', medicalNotes: null, photoUrl: null, createdAt: '2024-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-1-2', tenantId: 'demo', firstName: 'Adam', lastName: 'Saidi', dateOfBirth: '2018-05-20', sex: 'M', nationality: 'TN', classroom: 'CP-A', enrollmentDate: '2024-09-02', previousSchooling: null, parentEmail: 'ksaidi@parent.demo', siblingsCount: 2, addressLine: '5 av. Bourguiba', city: 'Tunis', postalCode: '1001', country: 'TN', motherTongue: 'Arabe', medicalNotes: null, photoUrl: null, createdAt: '2024-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-1-3', tenantId: 'demo', firstName: 'Sofia', lastName: 'Benali', dateOfBirth: '2018-01-10', sex: 'F', nationality: 'TN', classroom: 'CP-A', enrollmentDate: '2024-09-02', previousSchooling: null, parentEmail: 'nbenali@parent.demo', siblingsCount: 0, addressLine: '8 rue Ibn Khaldoun', city: 'Tunis', postalCode: '1002', country: 'TN', motherTongue: 'Arabe', medicalNotes: null, photoUrl: null, createdAt: '2024-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-1-4', tenantId: 'demo', firstName: 'Hamza', lastName: 'Khlifi', dateOfBirth: '2018-07-22', sex: 'M', nationality: 'TN', classroom: 'CP-A', enrollmentDate: '2024-09-02', previousSchooling: null, parentEmail: 'tkhlifi@parent.demo', siblingsCount: 1, addressLine: '20 cité El Amal', city: 'Tunis', postalCode: '2080', country: 'TN', motherTongue: 'Arabe', medicalNotes: null, photoUrl: null, createdAt: '2024-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-2-1', tenantId: 'demo', firstName: 'Ines', lastName: 'Gharbi', dateOfBirth: '2017-09-05', sex: 'F', nationality: 'TN', classroom: 'CE1-B', enrollmentDate: '2024-09-02', previousSchooling: 'CP-A', parentEmail: 'fgharbi@parent.demo', siblingsCount: 1, addressLine: '3 rue de la Paix', city: 'Tunis', postalCode: '1000', country: 'TN', motherTongue: 'Arabe', medicalNotes: null, photoUrl: null, createdAt: '2023-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-2-2', tenantId: 'demo', firstName: 'Mehdi', lastName: 'Ben Ali', dateOfBirth: '2017-11-18', sex: 'M', nationality: 'TN', classroom: 'CE1-B', enrollmentDate: '2024-09-02', previousSchooling: 'CP-A', parentEmail: 'rbenali@parent.demo', siblingsCount: 2, addressLine: '15 av. de la Liberté', city: 'Tunis', postalCode: '1002', country: 'TN', motherTongue: 'Arabe', medicalNotes: null, photoUrl: null, createdAt: '2023-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-2-3', tenantId: 'demo', firstName: 'Julie', lastName: 'Dupont', dateOfBirth: '2017-04-30', sex: 'F', nationality: 'FR', classroom: 'CE1-B', enrollmentDate: '2024-09-02', previousSchooling: 'CP-A', parentEmail: 'sdupont@parent.demo', siblingsCount: 0, addressLine: '7 rue Victor Hugo', city: 'Tunis', postalCode: '1003', country: 'TN', motherTongue: 'Français', medicalNotes: null, photoUrl: null, createdAt: '2023-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-3-1', tenantId: 'demo', firstName: 'Ibrahima', lastName: 'Ba', dateOfBirth: '2016-08-12', sex: 'M', nationality: 'SN', classroom: 'CM1-A', enrollmentDate: '2024-09-02', previousSchooling: 'CE2-A', parentEmail: 'iba@parent.demo', siblingsCount: 3, addressLine: '30 rue de Carthage', city: 'Tunis', postalCode: '2000', country: 'TN', motherTongue: 'Wolof', medicalNotes: null, photoUrl: null, createdAt: '2021-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-3-2', tenantId: 'demo', firstName: 'Yasmine', lastName: 'Gharbi', dateOfBirth: '2016-02-25', sex: 'F', nationality: 'TN', classroom: 'CM1-A', enrollmentDate: '2024-09-02', previousSchooling: 'CE2-A', parentEmail: 'fgharbi@parent.demo', siblingsCount: 1, addressLine: '3 rue de la Paix', city: 'Tunis', postalCode: '1000', country: 'TN', motherTongue: 'Arabe', medicalNotes: null, photoUrl: null, createdAt: '2021-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-4-1', tenantId: 'demo', firstName: 'Nour', lastName: 'Karoui', dateOfBirth: '2015-11-03', sex: 'F', nationality: 'TN', classroom: 'CM2-B', enrollmentDate: '2024-09-02', previousSchooling: 'CM1-A', parentEmail: 'mkaroui@parent.demo', siblingsCount: 2, addressLine: '11 rue Ibn Rachiq', city: 'Tunis', postalCode: '1000', country: 'TN', motherTongue: 'Arabe', medicalNotes: null, photoUrl: null, createdAt: '2020-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-4-2', tenantId: 'demo', firstName: 'Pierre', lastName: 'Simon', dateOfBirth: '2015-07-19', sex: 'M', nationality: 'FR', classroom: 'CM2-B', enrollmentDate: '2024-09-02', previousSchooling: 'CM1-A', parentEmail: 'jsimon@parent.demo', siblingsCount: 1, addressLine: '9 rue des Fleurs', city: 'Tunis', postalCode: '1001', country: 'TN', motherTongue: 'Français', medicalNotes: null, photoUrl: null, createdAt: '2020-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
  { id: 'ds-4-3', tenantId: 'demo', firstName: 'Dina', lastName: 'Belhaj', dateOfBirth: '2015-09-14', sex: 'F', nationality: 'TN', classroom: 'CM2-B', enrollmentDate: '2024-09-02', previousSchooling: 'CM1-A', parentEmail: 'rbelhaj@parent.demo', siblingsCount: 0, addressLine: '14 allée des Roses', city: 'Ariana', postalCode: '2080', country: 'TN', motherTongue: 'Arabe', medicalNotes: null, photoUrl: null, createdAt: '2020-09-01T08:00:00Z', updatedAt: '2024-09-01T08:00:00Z' },
];

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
