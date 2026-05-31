'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from '@/i18n/routing';
import {
  listMessages,
  markConversationRead,
  sendMessageHttp,
  type Message,
} from '@/lib/api/messaging';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import {
  connectMessagingSocket,
  emitMarkRead,
  emitSendMessage,
  type MessageNewPayload,
} from '@/lib/messaging/socket';

interface Props {
  conversationId: string;
}

export function ConversationThread({ conversationId }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [body, setBody] = useState('');
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['messaging', 'thread', conversationId],
    queryFn: () => listMessages(accessToken!, conversationId, { limit: 50 }),
    enabled: !!accessToken,
  });

  const allMessages = useMemo<Message[]>(() => {
    const history = data?.items ?? [];
    const seen = new Set(history.map((m) => m.id));
    return [...history, ...liveMessages.filter((m) => !seen.has(m.id))];
  }, [data?.items, liveMessages]);

  useEffect(() => {
    if (!accessToken || !currentUser) return;
    const socket = connectMessagingSocket(accessToken);

    const onMessageNew = (payload: MessageNewPayload) => {
      if (payload.conversationId !== conversationId) return;
      setLiveMessages((prev) => {
        if (prev.find((m) => m.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] });
    };

    socket.on('message:new', onMessageNew);
    socket.on('auth:error', (err: { code?: string }) => {
      setError(`Connexion temps réel impossible (${err?.code ?? 'AUTH_FAILED'}). Repli REST.`);
    });

    return () => {
      socket.off('message:new', onMessageNew);
    };
  }, [accessToken, conversationId, currentUser, queryClient]);

  useEffect(() => {
    if (!accessToken) return;
    markConversationRead(accessToken, conversationId).catch(() => {});
    const socket = connectMessagingSocket(accessToken);
    emitMarkRead(socket, conversationId);
    queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] });
  }, [accessToken, conversationId, allMessages.length, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!accessToken) throw new Error('NO_TOKEN');
      const socket = connectMessagingSocket(accessToken);
      if (socket.connected) {
        return emitSendMessage(socket, { conversationId, body: text });
      }
      return sendMessageHttp(accessToken, conversationId, text);
    },
    onSuccess: (message) => {
      setLiveMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setBody('');
      setError(null);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'SEND_FAILED');
    },
  });

  if (!accessToken || !currentUser) {
    return <p className="p-8 text-sm text-muted-foreground">Authentification requise.</p>;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || text.length > 2000 || sending) return;
    setSending(true);
    sendMutation.mutate(text, { onSettled: () => setSending(false) });
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <header className="border-b bg-background px-4 py-3">
        <Link href="/messages" className="text-sm text-primary hover:underline">
          ← Conversations
        </Link>
        <h1 className="mt-1 font-display text-lg font-medium">Conversation</h1>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/20 px-4 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement de l&apos;historique…</p>
        ) : allMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun message. Commencez la conversation.
          </p>
        ) : (
          <ul className="space-y-3">
            {allMessages.map((m) => {
              const isMe = m.senderId === currentUser.id;
              return (
                <li key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      isMe ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={`mt-1 text-xs ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <p className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 border-t bg-background px-4 py-3"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Écrire un message…"
          className="flex-1 resize-none rounded-md border px-3 py-2 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>
    </div>
  );
}
