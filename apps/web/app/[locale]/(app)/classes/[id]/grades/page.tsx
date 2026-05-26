import { GradesClient } from './grades-client';

/** V6 — `/classes/[id]/grades` — saisie notes par évaluation. */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string; locale: string };
}

export default function ClassGradesPage({ params }: PageProps): JSX.Element {
  return <GradesClient classId={params.id} />;
}
