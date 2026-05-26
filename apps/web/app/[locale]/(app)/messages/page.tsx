import { MessagesList } from './messages-list';

/**
 * V3-B — Messaging : page liste des conversations.
 * Server component → délègue à client `<MessagesList>` (TanStack Query).
 */
export const dynamic = 'force-dynamic';

export default function MessagesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-medium tracking-tight">Messages</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Conversations 1:1 avec les autres membres de votre établissement.
      </p>
      <div className="mt-8">
        <MessagesList />
      </div>
    </div>
  );
}
