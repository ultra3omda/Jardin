/** Centre de notifications — page liste (corrige le lien de la cloche). */
export const dynamic = 'force-dynamic';

import { NotificationsClient } from './notifications-client';

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Toutes vos notifications (messages, notes, présences, factures, annonces…).
        </p>
      </header>

      <NotificationsClient />
    </div>
  );
}
