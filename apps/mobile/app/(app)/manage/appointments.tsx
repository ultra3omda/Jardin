import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, colors, radius } from '@klasso/ui-mobile';
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  canManageAppointments,
  formatSlotRange,
  useSetAppointmentStatus,
  useStaffAppointments,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/api/appointments';
import { useAuthStore } from '@/lib/auth/store';

/**
 * G6 — Rendez-vous parents (staff/admin/enseignant). Liste des rendez-vous du
 * tenant avec actions Confirmer / Annuler (PATCH status). Gated par rôle.
 */
export default function ManageAppointmentsScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError, refetch } = useStaffAppointments(role);
  const setStatus = useSetAppointmentStatus();

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const appointments = data ?? [];

  async function handleSetStatus(appt: Appointment, status: AppointmentStatus) {
    if (setStatus.isPending) return;
    setBanner(null);
    setPendingId(appt.id);
    try {
      await setStatus.mutateAsync({ id: appt.id, status });
      setBanner(
        status === 'CONFIRMED' ? 'Rendez-vous confirmé.' : 'Rendez-vous annulé.',
      );
    } catch {
      setBanner('Action impossible. Réessayez.');
    } finally {
      setPendingId(null);
    }
  }

  if (!canManageAppointments(role)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
        <EmptyState
          icon="lock-closed-outline"
          title="Accès réservé"
          description="Cette page est réservée à l'équipe de l'établissement."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {banner ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.teal[50],
            borderWidth: 1,
            borderColor: colors.teal[100],
            borderRadius: radius.md,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color={colors.teal[600]} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.ink[700] }}>{banner}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : isError ? (
        <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }}>
          <Text style={{ color: colors.status.danger500, fontSize: 14 }}>Erreur de chargement.</Text>
          <View style={{ width: 160 }}>
            <Button label="Réessayer" variant="secondary" onPress={() => void refetch()} />
          </View>
        </View>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          title="Aucun rendez-vous"
          description="Les demandes de rendez-vous des parents apparaîtront ici."
        />
      ) : (
        appointments.map((appt) => (
          <AppointmentCard
            key={appt.id}
            appt={appt}
            busy={pendingId === appt.id}
            disabled={setStatus.isPending}
            onConfirm={() => void handleSetStatus(appt, 'CONFIRMED')}
            onCancel={() => void handleSetStatus(appt, 'CANCELLED')}
          />
        ))
      )}
    </ScrollView>
  );
}

function AppointmentCard({
  appt,
  busy,
  disabled,
  onConfirm,
  onCancel,
}: {
  appt: Appointment;
  busy: boolean;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const label = formatSlotRange(appt.slot.startsAt, appt.slot.endsAt);
  const statusColor = appointmentStatusColor(appt.status);
  const statusText = appointmentStatusLabel(appt.status);
  const isOpen = appt.status === 'REQUESTED' || appt.status === 'CONFIRMED';

  return (
    <View
      accessibilityLabel={`${label}. ${statusText}.`}
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: '700',
            color: colors.ink[900],
            textTransform: 'capitalize',
          }}
        >
          {label}
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: statusColor + '18',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{statusText}</Text>
        </View>
      </View>

      {appt.note ? (
        <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 6 }} numberOfLines={3}>
          {appt.note}
        </Text>
      ) : null}

      {isOpen ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {appt.status === 'REQUESTED' ? (
            <ActionButton
              icon="checkmark"
              label="Confirmer"
              tone="success"
              busy={busy}
              disabled={disabled}
              onPress={onConfirm}
            />
          ) : null}
          <ActionButton
            icon="close"
            label="Annuler"
            tone="danger"
            busy={busy}
            disabled={disabled}
            onPress={onCancel}
          />
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  busy,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  tone: 'success' | 'danger';
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const color = tone === 'success' ? colors.status.success500 : colors.status.danger500;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: color + '14',
        borderWidth: 1,
        borderColor: color + '33',
        opacity: disabled && !busy ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={16} color={color} />
      )}
      <Text style={{ fontSize: 13, fontWeight: '700', color }}>{label}</Text>
    </Pressable>
  );
}
