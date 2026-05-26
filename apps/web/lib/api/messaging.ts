'use client';

/**
 * V3-B — Messaging API client (REST).
 * Pour le temps réel : voir `lib/messaging/socket.ts`.
 */
const BASE = '/api/messaging';

export interface ParticipantSummary {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface MessagePreview {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  participants: ParticipantSummary[];
  lastMessage?: MessagePreview;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new Error(body?.code ?? body?.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listConversations(token: string): Promise<{ items: Conversation[] }> {
  const res = await fetch(`${BASE}/conversations`, { headers: authHeaders(token) });
  return ok(res);
}

export async function openConversation(
  token: string,
  recipientUserId: string,
): Promise<Conversation> {
  const res = await fetch(`${BASE}/conversations`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ recipientUserId }),
  });
  return ok(res);
}

export async function listMessages(
  token: string,
  conversationId: string,
  query: { before?: string; limit?: number } = {},
): Promise<{ items: Message[]; hasMore: boolean }> {
  const sp = new URLSearchParams();
  if (query.before) sp.set('before', query.before);
  if (query.limit) sp.set('limit', String(query.limit));
  const qs = sp.toString();
  const url = `${BASE}/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  return ok(res);
}

export async function sendMessageHttp(
  token: string,
  conversationId: string,
  body: string,
): Promise<Message> {
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ conversationId, body }),
  });
  return ok(res);
}

export async function markConversationRead(token: string, conversationId: string): Promise<void> {
  const res = await fetch(`${BASE}/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`HTTP ${res.status}`);
  }
}
