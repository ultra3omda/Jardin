import { StudentDetail } from './student-detail';
import { StudentParents } from './_components/student-parents';

/**
 * V2 — Module Élèves : page détail `/students/[id]`.
 * V3-A — Section "Parents liés" sous le détail élève.
 * Updated — StudentParents with email-based linking and modal UX.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default function StudentDetailPage({ params }: PageProps) {
  return (
    <div className="space-y-6">
      <StudentDetail id={params.id} />
      <StudentParents studentId={params.id} />
    </div>
  );
}
