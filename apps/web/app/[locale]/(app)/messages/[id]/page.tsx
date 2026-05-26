import { ConversationThread } from './conversation-thread';

/**
 * V3-B — Messaging : page thread `/messages/[id]`.
 * Server component → délègue à client `<ConversationThread>` (TanStack + Socket.IO).
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default function ConversationPage({ params }: PageProps) {
  return <ConversationThread conversationId={params.id} />;
}
