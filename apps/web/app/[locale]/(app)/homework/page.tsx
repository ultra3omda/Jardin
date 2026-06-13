/** Devoirs (TAF) — liste & gestion enseignant/admin. Server Component shell. */
export const dynamic = 'force-dynamic';

import { HomeworkClient } from './homework-client';

export default function HomeworkPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Devoirs</h1>
        <p className="text-sm text-muted-foreground">
          Travail à faire par classe : création, échéances et suivi des rendus.
        </p>
      </header>

      <HomeworkClient />
    </div>
  );
}
