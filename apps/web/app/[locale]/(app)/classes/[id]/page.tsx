import { ClassDetail } from './class-detail';

/** V4 — `/classes/[id]` detail with weekly EDT grid. */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default function ClassDetailPage({ params }: PageProps) {
  return <ClassDetail id={params.id} />;
}
