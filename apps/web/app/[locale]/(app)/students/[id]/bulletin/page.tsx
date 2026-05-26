import { BulletinClient } from './bulletin-client';

/** V6 — `/students/[id]/bulletin` — generate + download PDF. */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string; locale: string };
}

export default function StudentBulletinPage({ params }: PageProps): JSX.Element {
  return <BulletinClient studentId={params.id} />;
}
