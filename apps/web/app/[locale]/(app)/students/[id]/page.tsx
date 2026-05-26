import { StudentDetail } from './student-detail';

/**
 * V2 — Module Élèves : page détail `/students/[id]`.
 * Server component — délègue à client `<StudentDetail>` (TanStack Query).
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default function StudentDetailPage({ params }: PageProps) {
  return <StudentDetail id={params.id} />;
}
