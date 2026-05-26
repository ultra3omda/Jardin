import { ClassesList } from './classes-list';

/** V4 — `/classes` list. */
export const dynamic = 'force-dynamic';

export default function ClassesPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight">Classes</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestion des classes, enseignants assignés et emploi du temps hebdomadaire.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <ClassesList />
      </div>
    </div>
  );
}
