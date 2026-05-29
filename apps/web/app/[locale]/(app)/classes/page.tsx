import { ClassesList } from './classes-list';

/** V4 — `/classes` list. */
export const dynamic = 'force-dynamic';

export default function ClassesPage() {
  // The page heading + description are owned by `ResourceListPage` inside
  // `ClassesList` (same pattern as the Teachers page). Keeping a second <h1>
  // here would duplicate the "Classes" heading (a WCAG violation and an
  // ambiguous E2E target), so the wrapper only provides layout.
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <ClassesList />
    </div>
  );
}
