import { StudentsHeader } from './students-header';
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
      <StudentsHeader />
      <StudentsList />
    </div>
  );
}
