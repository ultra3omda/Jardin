import type { Conversation } from '@/lib/api/messaging';

const PREVIEW_MAX = 80;

export function otherParticipant(c: Conversation, currentUserId: string) {
  return c.participants.find((p) => p.userId !== currentUserId);
}

/** Aperçu une ligne du dernier message ("Vous : …", tronqué à 80). */
export function formatConversationPreview(c: Conversation, currentUserId: string): string {
  if (!c.lastMessage) return 'Conversation ouverte. Aucun message encore.';
  const prefix = c.lastMessage.senderId === currentUserId ? 'Vous : ' : '';
  const body =
    c.lastMessage.body.length > PREVIEW_MAX
      ? `${c.lastMessage.body.slice(0, PREVIEW_MAX - 3)}…`
      : c.lastMessage.body;
  return `${prefix}${body}`;
}
