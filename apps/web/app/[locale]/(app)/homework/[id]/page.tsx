/** Devoir — détail + suivi des rendus. Server Component shell. */
export const dynamic = 'force-dynamic';

import { HomeworkDetailClient } from './homework-detail-client';

export default function HomeworkDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <HomeworkDetailClient id={params.id} />
    </div>
  );
}
