/** Devoirs (TAF) — liste & gestion enseignant/admin. Server Component shell. */
export const dynamic = 'force-dynamic';

import { PageHeader } from '@/components/ui/page-header';
import { HomeworkClient } from './homework-client';

export default function HomeworkPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Devoirs"
        description="Travail à faire par classe : création, échéances et suivi des rendus."
      />
      <HomeworkClient />
    </div>
  );
}
