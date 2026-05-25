import type { Route } from 'next';
import Link from 'next/link';

import { StudentsList } from './students-list';

/**
 * V2 — Module Élèves : page liste `/students`.
 * Server component minimal — la liste/recherche/pagination est dans
 * `StudentsList` (client component, TanStack Query).
 */
export const dynamic = 'force-dynamic';

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Élèves</h1>
          <p className="text-sm text-muted-foreground">
            Gestion des élèves de l&apos;établissement.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={'/students/bulk-import' as Route}
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
          >
            Import CSV
          </Link>
          <Link
            href={'/students/new' as Route}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Nouvel élève
          </Link>
        </div>
      </header>
      <StudentsList />
    </div>
  );
}
