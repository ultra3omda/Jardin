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

// ─── Demo fallback data (used when the conversation ID is a client-side demo ID) ───

const DEMO_SELF = '__demo_self__';

const DEMO_MESSAGES_BY_CONV: Record<string, Message[]> = {
  'demo-conv-1': [
    { id: 'dm-1-1', conversationId: 'demo-conv-1', senderId: 'demo-parent-1', body: 'Bonjour, pouvez-vous me confirmer les horaires de la réunion parents-professeurs ?', createdAt: new Date(Date.now() - 5 * 3600_000).toISOString() },
    { id: 'dm-1-2', conversationId: 'demo-conv-1', senderId: DEMO_SELF, body: 'Bonjour Mme Trabelsi ! La réunion aura lieu le jeudi 20 mars à 17h30, en salle polyvalente.', createdAt: new Date(Date.now() - 4.5 * 3600_000).toISOString() },
    { id: 'dm-1-3', conversationId: 'demo-conv-1', senderId: 'demo-parent-1', body: 'Merci beaucoup. Est-ce que je dois apporter quelque chose ?', createdAt: new Date(Date.now() - 4 * 3600_000).toISOString() },
    { id: 'dm-1-4', conversationId: 'demo-conv-1', senderId: DEMO_SELF, body: 'Non, rien de particulier. Les bulletins du trimestre précédent si vous les avez.', createdAt: new Date(Date.now() - 3 * 3600_000).toISOString() },
    { id: 'dm-1-5', conversationId: 'demo-conv-1', senderId: 'demo-parent-1', body: 'Parfait, à jeudi alors !', createdAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
  ],
  'demo-conv-2': [
    { id: 'dm-2-1', conversationId: 'demo-conv-2', senderId: 'demo-parent-2', body: 'Bonjour, je voulais savoir si le bulletin du 2ème trimestre était prêt ?', createdAt: new Date(Date.now() - 2 * 86400_000 - 2 * 3600_000).toISOString() },
    { id: 'dm-2-2', conversationId: 'demo-conv-2', senderId: DEMO_SELF, body: 'Bonjour M. Ben Ali. Oui, le bulletin sera téléchargeable vendredi soir depuis votre espace parent.', createdAt: new Date(Date.now() - 2 * 86400_000 - 1.5 * 3600_000).toISOString() },
    { id: 'dm-2-3', conversationId: 'demo-conv-2', senderId: 'demo-parent-2', body: "D'accord merci ! J'ai aussi une question sur les frais scolaires du 3ème trimestre.", createdAt: new Date(Date.now() - 2 * 86400_000 - 1 * 3600_000).toISOString() },
    { id: 'dm-2-4', conversationId: 'demo-conv-2', senderId: DEMO_SELF, body: 'Bien sûr, les frais seront exigibles à partir du 1er avril. Vous recevrez un rappel par email.', createdAt: new Date(Date.now() - 1 * 86400_000).toISOString() },
  ],
  'demo-conv-3': [
    { id: 'dm-3-1', conversationId: 'demo-conv-3', senderId: 'demo-teacher-1', body: 'Rappel : sortie pédagogique mercredi, prévoir une tenue adaptée.', createdAt: new Date(Date.now() - 3 * 86400_000).toISOString() },
    { id: 'dm-3-2', conversationId: 'demo-conv-3', senderId: DEMO_SELF, body: "Bonjour Mme Martin, est-ce qu'on a besoin d'une autorisation parentale supplémentaire ?", createdAt: new Date(Date.now() - 2.5 * 86400_000).toISOString() },
    { id: 'dm-3-3', conversationId: 'demo-conv-3', senderId: 'demo-teacher-1', body: "Non, l'autorisation annuelle suffit pour cette sortie.", createdAt: new Date(Date.now() - 2 * 86400_000).toISOString() },
    { id: 'dm-3-4', conversationId: 'demo-conv-3', senderId: DEMO_SELF, body: "Très bien, je ferai passer l'information aux parents concernés.", createdAt: new Date(Date.now() - 1.5 * 86400_000).toISOString() },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

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
    // For client-side demo conversation IDs, inject demo messages when the API
    // returns nothing (the real API doesn't know about these fake IDs).
    if (conversationId.startsWith('demo-') && history.length === 0 && currentUser) {
      const demoMsgs = DEMO_MESSAGES_BY_CONV[conversationId] ?? [];
      return demoMsgs.map((m) =>
        m.senderId === DEMO_SELF ? { ...m, senderId: currentUser.id } : m,
      );
    }
    const seen = new Set(history.map((m) => m.id));
    return [...history, ...liveMessages.filter((m) => !seen.has(m.id))];
  }, [data?.items, liveMessages, conversationId, currentUser]);

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
