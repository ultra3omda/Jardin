import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, radius } from '@klasso/ui-mobile';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  type AppNotification,
} from '@/lib/api/notifications';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  MESSAGE: '#60a5fa',
  GRADE: '#34d399',
  ATTENDANCE: '#f2683f',
  INVOICE: '#f87171',
  ANNOUNCEMENT: '#a78bfa',
  SYSTEM: '#94a3b8',
};

function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS.SYSTEM;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function NotifSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderWidth: 1,
        borderColor: colors.paper[100],
      }}
    >
      <View
        style={{
          marginTop: 4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.paper[100],
          flexShrink: 0,
        }}
      />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 13, width: '70%', backgroundColor: colors.paper[100], borderRadius: 4 }} />
        <View style={{ height: 11, width: '90%', backgroundColor: colors.paper[100], borderRadius: 4 }} />
        <View style={{ height: 10, width: '30%', backgroundColor: colors.paper[100], borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Notification row
// ---------------------------------------------------------------------------

interface NotifRowProps {
  notification: AppNotification;
  onPress: () => void;
}

function NotifRow({ notification: n, onPress }: NotifRowProps) {
  const isUnread = !n.readAt;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        backgroundColor: isUnread ? 'rgba(242,104,63,0.06)' : colors.white,
        borderRadius: radius.lg,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderWidth: 1,
        borderColor: isUnread ? 'rgba(242,104,63,0.2)' : colors.paper[100],
      }}
    >
      {/* Type indicator dot */}
      <View
        style={{
          marginTop: 4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: typeColor(n.type),
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 3,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: isUnread ? '700' : '600',
              color: colors.ink[900],
              flex: 1,
              marginRight: 8,
            }}
            numberOfLines={1}
          >
            {n.title}
          </Text>
          <Text style={{ fontSize: 11, color: colors.ink[300], flexShrink: 0 }}>
            {relativeTime(n.createdAt)}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 12,
            color: isUnread ? colors.ink[700] : colors.ink[300],
            lineHeight: 17,
          }}
          numberOfLines={2}
        >
          {n.body}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.items ?? [];

  function handlePress(n: AppNotification) {
    markRead.mutate(n.id);
    const href = (n.data as { href?: string } | undefined)?.href;
    if (href) {
      router.push(href as never);
    }
  }

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
            Notifications
          </Text>
          {notifications.some((n) => !n.readAt) && (
            <TouchableOpacity
              onPress={() => markAllRead.mutate()}
              activeOpacity={0.7}
              style={{
                backgroundColor: '#f2683f',
                borderRadius: radius.md,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: '#0f1419', fontSize: 11, fontWeight: '700' }}>
                Tout lire
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <NotifSkeleton />
          <NotifSkeleton />
          <NotifSkeleton />
          <NotifSkeleton />
          <NotifSkeleton />
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
          <Text
            style={{
              fontSize: 14,
              color: colors.ink[500],
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Impossible de charger les notifications.
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
      {!isLoading && !isError && notifications.length === 0 && (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 64,
            paddingHorizontal: 32,
          }}
        >
          <Text style={{ fontSize: 32, marginBottom: 12 }}>🔔</Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: colors.ink[700],
              marginBottom: 4,
              textAlign: 'center',
            }}
          >
            Aucune notification
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink[300], textAlign: 'center' }}>
            Vous serez notifié des événements importants ici.
          </Text>
        </View>
      )}

      {/* List */}
      {!isLoading && !isError && notifications.length > 0 && (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {notifications.map((n) => (
            <NotifRow key={n.id} notification={n} onPress={() => handlePress(n)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
