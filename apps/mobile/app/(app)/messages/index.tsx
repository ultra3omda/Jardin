import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import { useConversations, type Conversation, type Participant } from '@/lib/api/messaging';

const AVATAR_COLORS = ['#f2683f', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c', '#38bdf8', '#4ade80'];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function avatarColor(id: string): string {
  return AVATAR_COLORS[(id.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function ThreadRow({ conv, meId }: { conv: Conversation; meId?: string }) {
  const other: Participant | undefined =
    conv.participants.find((p) => p.userId !== meId) ?? conv.participants[0];
  if (!other) return null;
  const name = `${other.firstName} ${other.lastName}`.trim();
  const preview = conv.lastMessage?.body ?? 'Nouvelle conversation';
  const unread = conv.unreadCount;
  const color = avatarColor(other.userId);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/messages/[id]', params: { id: conv.id, name } })}
      accessibilityRole="button"
      accessibilityLabel={`Conversation avec ${name}`}
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: unread > 0 ? 'rgba(242,104,63,0.25)' : colors.paper[100],
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: color + '1a',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: color + '40',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color }}>
          {other.firstName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: unread > 0 ? '700' : '600',
              color: colors.ink[900],
              flex: 1,
              marginRight: 8,
            }}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={{ fontSize: 11, color: colors.ink[300] }}>{formatTime(conv.updatedAt)}</Text>
        </View>
        <Text
          style={{ fontSize: 12, color: unread > 0 ? colors.ink[700] : colors.ink[300] }}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>
      {unread > 0 ? (
        <View
          style={{
            minWidth: 20,
            height: 20,
            paddingHorizontal: 6,
            borderRadius: 10,
            backgroundColor: colors.ambre[500],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.white }}>{unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function MessagesScreen() {
  const meId = useAuthStore((s) => s.user?.id);
  const { data, isLoading, isError, refetch } = useConversations();
  const conversations = data?.items ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink[900], marginBottom: 16 }}>
        Messages
      </Text>

      {isLoading ? (
        <Text style={{ color: colors.ink[500] }}>Chargement…</Text>
      ) : isError ? (
        <Pressable onPress={() => void refetch()}>
          <Text style={{ color: colors.status.danger500 }}>
            Impossible de charger les conversations. Toucher pour réessayer.
          </Text>
        </Pressable>
      ) : conversations.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 56 }}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>✉️</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink[700] }}>
            Aucune conversation
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink[300], textAlign: 'center', marginTop: 4 }}>
            Vos échanges avec l&apos;équipe apparaîtront ici.
          </Text>
        </View>
      ) : (
        conversations.map((c) => <ThreadRow key={c.id} conv={c} meId={meId} />)
      )}
    </ScrollView>
  );
}
