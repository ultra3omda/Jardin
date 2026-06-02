import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import {
  markConversationRead,
  useMessages,
  useSendMessage,
  type Message,
} from '@/lib/api/messaging';

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/** Conversation thread with a compose box — available to every role. */
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string; name?: string }>();
  const conversationId = id!;
  const meId = useAuthStore((s) => s.user?.id);
  const { data, isLoading, isError, refetch } = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const [text, setText] = useState('');

  // Mark read on open.
  useEffect(() => {
    if (conversationId) void markConversationRead(conversationId).catch(() => undefined);
  }, [conversationId]);

  // API returns most-recent-first; show oldest-first in the thread.
  const messages: Message[] = [...(data?.items ?? [])].reverse();

  function submit() {
    const body = text.trim();
    if (!body) return;
    send.mutate(body, { onSuccess: () => setText('') });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 12 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Pressable onPress={() => void refetch()}>
            <Text style={{ color: colors.status.danger500 }}>
              Impossible de charger les messages. Toucher pour réessayer.
            </Text>
          </Pressable>
        ) : messages.length === 0 ? (
          <Text style={{ color: colors.ink[300], textAlign: 'center', marginTop: 32 }}>
            Aucun message. Démarrez la conversation ci-dessous.
          </Text>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <View
                key={m.id}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  backgroundColor: mine ? colors.ambre[500] : colors.white,
                  borderWidth: mine ? 0 : 1,
                  borderColor: colors.paper[100],
                  borderRadius: 16,
                  borderBottomRightRadius: mine ? 4 : 16,
                  borderBottomLeftRadius: mine ? 16 : 4,
                  paddingVertical: 9,
                  paddingHorizontal: 13,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 14, color: mine ? colors.white : colors.ink[900] }}>
                  {m.body}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: mine ? 'rgba(255,255,255,0.8)' : colors.ink[300],
                    marginTop: 4,
                    textAlign: 'right',
                  }}
                >
                  {timeOf(m.createdAt)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Composer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
          padding: 12,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.paper[100],
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Votre message…"
          placeholderTextColor={colors.ink[300]}
          multiline
          accessibilityLabel="Saisir un message"
          style={{
            flex: 1,
            maxHeight: 110,
            minHeight: 42,
            borderWidth: 1,
            borderColor: colors.paper[100],
            borderRadius: radius.lg,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: 15,
            color: colors.ink[900],
            backgroundColor: colors.paper[50],
          }}
        />
        <Pressable
          onPress={submit}
          disabled={send.isPending || !text.trim()}
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: colors.ambre[500],
            alignItems: 'center',
            justifyContent: 'center',
            opacity: send.isPending || !text.trim() ? 0.5 : 1,
          }}
        >
          {send.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={{ color: colors.white, fontWeight: '800', fontSize: 18 }}>↑</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
