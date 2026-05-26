'use client';

import { io, type Socket } from 'socket.io-client';

import type { Message } from '@/lib/api/messaging';

/**
 * V3-B — Socket.IO client wrapper.
 *
 * The browser connects DIRECTLY to NEXT_PUBLIC_API_URL (Railway) on the
 * `/messaging` namespace, bypassing the Vercel/Next proxy (WebSocket can't
 * be passthrough'd through Next Route Handlers cleanly).
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

let currentSocket: Socket | null = null;

export interface MessageNewPayload {
  conversationId: string;
  message: Message;
}

export interface MessageReadPayload {
  conversationId: string;
  readerId: string;
  readAt: string;
}

export function connectMessagingSocket(accessToken: string): Socket {
  if (currentSocket && currentSocket.connected) {
    return currentSocket;
  }
  currentSocket = io(`${API_URL}/messaging`, {
    transports: ['websocket'],
    auth: { token: accessToken },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  return currentSocket;
}

export function disconnectMessagingSocket(): void {
  if (currentSocket) {
    currentSocket.disconnect();
    currentSocket = null;
  }
}

/**
 * Promise wrapper around the `message:send` event with the ack pattern.
 * Returns the created Message on success; rejects with the WsException payload
 * (which carries our domain `code`) on failure.
 */
export function emitSendMessage(
  socket: Socket,
  payload: { conversationId: string; body: string },
): Promise<Message> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(8000)
      .emit('message:send', payload, (err: unknown, response: unknown) => {
        if (err) return reject(err);
        const r = response as Message | { error?: { code?: string } };
        if (r && typeof r === 'object' && 'error' in r) {
          return reject(new Error((r.error as { code?: string })?.code ?? 'WS_ERROR'));
        }
        resolve(response as Message);
      });
  });
}

export function emitMarkRead(socket: Socket, conversationId: string): void {
  socket.emit('conversation:read', { conversationId });
}
