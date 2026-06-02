import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * Messagerie 1:1 (tous les rôles). Aligné sur
 * apps/api/src/messaging/messaging.controller.ts :
 *  - GET  /messaging/conversations                  → { items }
 *  - GET  /messaging/conversations/:id/messages     → { items, hasMore }
 *  - POST /messaging/messages { conversationId, body }
 *  - POST /messaging/conversations { recipientUserId }
 *  - POST /messaging/conversations/:id/read
 */

export interface Participant {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  lastMessage?: { id: string; body: string; senderId: string; createdAt: string };
  unreadCount: number;
}

export interface ConversationsResponse {
  items: Conversation[];
}

export interface MessagesResponse {
  items: Message[];
  hasMore: boolean;
}

export const MESSAGING_KEYS = {
  all: ['messaging'] as const,
  conversations: () => ['conversations'] as const,
  messages: (id: string) => ['conversation-messages', id] as const,
} as const;

/** Fetch all conversations for the current user. */
export function useConversations() {
  return useQuery({
    queryKey: MESSAGING_KEYS.conversations(),
    queryFn: () => fetchApi<ConversationsResponse>('/api/messaging/conversations'),
  });
}

/** Fetch the message history of a conversation (most recent first from API). */
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: MESSAGING_KEYS.messages(conversationId),
    queryFn: () =>
      fetchApi<MessagesResponse>(`/api/messaging/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}

/** Send a message to an existing conversation. */
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      fetchApi<Message>('/api/messaging/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId, body }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.messages(conversationId) });
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.conversations() });
    },
  });
}

/** Open (or get) a 1:1 conversation with a recipient. */
export function openConversation(recipientUserId: string): Promise<Conversation> {
  return fetchApi<Conversation>('/api/messaging/conversations', {
    method: 'POST',
    body: JSON.stringify({ recipientUserId }),
  });
}

/** Mark all messages in a conversation as read. */
export function markConversationRead(conversationId: string): Promise<void> {
  return fetchApi<void>(`/api/messaging/conversations/${conversationId}/read`, { method: 'POST' });
}
