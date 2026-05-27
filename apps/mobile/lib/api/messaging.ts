import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: Participant;
}

export interface Conversation {
  id: string;
  participants: { user: Participant }[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface ConversationsResponse {
  items: Conversation[];
  total: number;
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  messages: Message[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const MESSAGING_KEYS = {
  all: ['messaging'] as const,
  conversations: () => ['conversations'] as const,
  conversation: (id: string) => ['conversation', id] as const,
} as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch all conversations for the current user. */
export function useConversations() {
  return useQuery({
    queryKey: MESSAGING_KEYS.conversations(),
    queryFn: () => fetchApi<ConversationsResponse>('/api/messaging/conversations'),
  });
}

/** Fetch a single conversation with its messages. */
export function useConversation(id: string) {
  return useQuery({
    queryKey: MESSAGING_KEYS.conversation(id),
    queryFn: () =>
      fetchApi<ConversationDetailResponse>(
        `/api/messaging/conversations/${id}/messages`,
      ),
    enabled: !!id,
  });
}

/** Send a message to an existing conversation. */
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      fetchApi<Message>(`/api/messaging/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.conversation(conversationId) });
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.conversations() });
    },
  });
}
