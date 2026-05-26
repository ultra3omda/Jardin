import { ParentsSection } from './parents-section';
import { StudentDetail } from './student-detail';

/**
 * V2 — Module Élèves : page détail `/students/[id]`.
 * V3-A — Ajoute la section "Parents liés" sous le détail élève.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default function StudentDetailPage({ params }: PageProps) {
  return (
    <div className="space-y-6">
      <StudentDetail id={params.id} />
      <ParentsSection studentId={params.id} />
    </div>
  );
}
