'use client';

import type { Route } from 'next';
import { Link } from '@/i18n/routing';

import { useSchoolTerms } from '@/lib/school/use-school-terms';

/** En-tête de la liste élèves/enfants — vocabulaire adapté au type d'établissement. */
export function StudentsHeader() {
  const terms = useSchoolTerms();
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{terms.students}</h1>
        <p className="text-sm text-muted-foreground">
          Gestion des {terms.students.toLowerCase()} de l&apos;établissement.
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
          + {terms.isKindergarten ? 'Nouvel enfant' : 'Nouvel élève'}
        </Link>
      </div>
    </header>
  );
}
