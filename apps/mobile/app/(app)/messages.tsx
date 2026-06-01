import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import { useConversations, type Conversation } from '@/lib/api/messaging';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  '#f2683f', '#60a5fa', '#34d399', '#f87171',
  '#a78bfa', '#fb923c', '#38bdf8', '#4ade80',
];

const ROLE_LABELS: Record<string, string> = {
  SCHOOL_ADMIN: 'Direction',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  STAFF: 'Personnel',
  SUPER_ADMIN: 'Super Admin',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return 'Hier';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

function avatarColorFromId(id: string): string {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ThreadSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: colors.paper[100],
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper[100] }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 13, width: '60%', backgroundColor: colors.paper[100], borderRadius: 4 }} />
        <View style={{ height: 11, width: '40%', backgroundColor: colors.paper[100], borderRadius: 4 }} />
        <View style={{ height: 11, width: '80%', backgroundColor: colors.paper[100], borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Thread row
// ---------------------------------------------------------------------------

interface ThreadRowProps {
  conversation: Conversation;
  currentUserId: string | undefined;
}

function ThreadRow({ conversation, currentUserId }: ThreadRowProps) {
  const otherParticipant =
    conversation.participants.find((p) => p.user.id !== currentUserId)?.user ??
    conversation.participants[0]?.user;

  if (!otherParticipant) return null;

  const name = `${otherParticipant.firstName} ${otherParticipant.lastName}`.trim();
  const role = ROLE_LABELS[otherParticipant.role] ?? otherParticipant.role;
  const preview = conversation.lastMessage?.content ?? 'Nouvelle conversation';
  const time = formatTime(conversation.updatedAt);
  const unread = conversation.unreadCount;
  const avatarColor = avatarColorFromId(otherParticipant.id);
  const initial = otherParticipant.firstName.charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: unread > 0 ? 'rgba(242,104,63,0.25)' : colors.paper[100],
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: avatarColor + '1a',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderWidth: 1.5,
          borderColor: avatarColor + '40',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: avatarColor }}>
          {initial}
        </Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 2,
          }}
        >
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
          <Text style={{ fontSize: 11, color: colors.ink[300], flexShrink: 0 }}>
            {time}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.ink[500], marginBottom: 3 }}>
          {role}
        </Text>
        <Text
          style={{ fontSize: 12, color: unread > 0 ? colors.ink[700] : colors.ink[300] }}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>

      {/* Unread badge */}
      {unread > 0 && (
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#f2683f',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f1419' }}>
            {unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MessagesScreen() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, refetch } = useConversations();

  const conversations = data?.items ?? [];
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Header */}
      <View style={{ padding: 20, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink[900] }}>
            Messages
          </Text>
          {totalUnread > 0 && (
            <View
              style={{
                backgroundColor: '#f2683f',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#0f1419', fontSize: 11, fontWeight: '700' }}>
                {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
        {!isLoading && !isError && (
          <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 2 }}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <ThreadSkeleton />
          <ThreadSkeleton />
          <ThreadSkeleton />
          <ThreadSkeleton />
        </View>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 48,
            paddingHorizontal: 32,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.ink[500], textAlign: 'center', marginBottom: 16 }}>
            Impossible de charger les conversations.
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            style={{
              backgroundColor: '#f2683f',
              borderRadius: radius.md,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f1419' }}>
              Réessayer
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty */}
      {!isLoading && !isError && conversations.length === 0 && (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 64,
            paddingHorizontal: 32,
          }}
        >
          <Text style={{ fontSize: 32, marginBottom: 12 }}>✉️</Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: colors.ink[700],
              marginBottom: 4,
              textAlign: 'center',
            }}
          >
            Aucune conversation
          </Text>
          <Text
            style={{ fontSize: 13, color: colors.ink[300], textAlign: 'center' }}
          >
            Vos échanges avec l'équipe pédagogique apparaîtront ici.
          </Text>
        </View>
      )}

      {/* Thread list */}
      {!isLoading && !isError && conversations.length > 0 && (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {conversations.map((conversation) => (
            <ThreadRow
              key={conversation.id}
              conversation={conversation}
              currentUserId={user?.id}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
