import { PageHeader } from '@/components/ui/page-header';
import { MessagesList } from './messages-list';

/**
 * V3-B — Messaging : page liste des conversations.
 * Server component → délègue à client `<MessagesList>` (TanStack Query).
 */
export const dynamic = 'force-dynamic';

export default function MessagesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Messages"
        description="Conversations 1:1 avec les autres membres de votre établissement."
      />
      <div className="mt-8">
        <MessagesList />
      </div>
    </div>
  );
}
