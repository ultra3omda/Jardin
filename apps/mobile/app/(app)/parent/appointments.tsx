import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, Picker, colors, radius } from '@klasso/ui-mobile';
import { ApiError } from '@/lib/api/client';
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatSlotRange,
  useAppointmentTypes,
  useAvailableSlots,
  useBookAppointment,
  useMyAppointments,
  type Appointment,
  type AppointmentSlot,
} from '@/lib/api/appointments';
import { useMyChildren, type MyChild } from '@/lib/api/parent';
import { useAuthStore } from '@/lib/auth/store';

const ACCENT = colors.teal[600];

/**
 * G6 — Rendez-vous parents (parent). Le parent choisit un type, (option) un
 * enfant, puis réserve un créneau disponible. Ses rendez-vous existants sont
 * listés avec leur statut. Le PATCH de statut est réservé au staff, donc aucune
 * action d'annulation n'est proposée ici (elle renverrait 403).
 */
export default function ParentAppointmentsScreen() {
  const role = useAuthStore((s) => s.user?.role);

  const types = useAppointmentTypes(role);
  const slots = useAvailableSlots(role);
  const mine = useMyAppointments(role);
  const children = useMyChildren();
  const book = useBookAppointment();

  const typeOptions = types.data ?? [];
  const kids = children.data ?? [];
  const availableSlots = slots.data ?? [];
  const myAppointments = mine.data ?? [];

  const [typeId, setTypeId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null,
  );

  const activeTypeId = typeId ?? typeOptions[0]?.id ?? null;

  const typeOptionsForPicker = useMemo(
    () =>
      typeOptions.map((t) => ({
        value: t.id,
        label: t.name,
        hint: `${t.durationMin} min`,
      })),
    [typeOptions],
  );

  async function handleBook(slot: AppointmentSlot) {
    if (!activeTypeId || book.isPending) return;
    setBanner(null);
    setBookingSlotId(slot.id);
    try {
      await book.mutateAsync({
        slotId: slot.id,
        typeId: activeTypeId,
        studentId: childId ?? undefined,
      });
      setBanner({
        tone: 'success',
        message: `Rendez-vous demandé pour ${formatSlotRange(slot.startsAt, slot.endsAt)}.`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setBanner({
          tone: 'error',
          message: 'Ce créneau vient d’être réservé. La liste a été mise à jour.',
        });
        void slots.refetch();
      } else {
        setBanner({ tone: 'error', message: 'Réservation impossible. Réessayez.' });
      }
    } finally {
      setBookingSlotId(null);
    }
  }

  const isInitialLoading = types.isLoading || slots.isLoading;

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
            backgroundColor: banner.tone === 'success' ? colors.teal[50] : '#fde8e8',
            borderWidth: 1,
            borderColor: banner.tone === 'success' ? colors.teal[100] : '#f5c2c2',
            borderRadius: radius.md,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Ionicons
            name={banner.tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={banner.tone === 'success' ? ACCENT : colors.status.danger500}
          />
          <Text style={{ flex: 1, fontSize: 13, color: colors.ink[700] }}>{banner.message}</Text>
        </View>
      ) : null}

      {/* ─── Réservation ─── */}
      <SectionTitle>Prendre un rendez-vous</SectionTitle>

      {isInitialLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : types.isError || slots.isError ? (
        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 16 }}>
          <Text style={{ color: colors.status.danger500, fontSize: 14 }}>Erreur de chargement.</Text>
          <View style={{ width: 160 }}>
            <Button
              label="Réessayer"
              variant="secondary"
              onPress={() => {
                void types.refetch();
                void slots.refetch();
              }}
            />
          </View>
        </View>
      ) : typeOptions.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Aucun type de rendez-vous"
          description="L'établissement n'a pas encore ouvert de motifs de rendez-vous."
        />
      ) : (
        <>
          <Picker
            label="Motif du rendez-vous"
            required
            value={activeTypeId ?? ''}
            onChange={(v) => {
              setTypeId(v);
              setBanner(null);
            }}
            options={typeOptionsForPicker}
          />

          {kids.length > 0 ? (
            <Picker
              label="Enfant concerné (optionnel)"
              value={childId ?? ''}
              placeholder="Aucun enfant en particulier"
              onChange={(v) => setChildId(v)}
              options={kids.map((c: MyChild) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName}`,
                hint: c.className ?? undefined,
              }))}
            />
          ) : null}

          <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 4, marginBottom: 10 }}>
            Créneaux disponibles
          </Text>

          {availableSlots.length === 0 ? (
            <EmptyState
              icon="time-outline"
              title="Aucun créneau"
              description="Aucun créneau n'est disponible pour le moment. Revenez plus tard."
            />
          ) : (
            availableSlots.map((slot) => (
              <SlotRow
                key={slot.id}
                slot={slot}
                disabled={book.isPending}
                busy={bookingSlotId === slot.id}
                onBook={() => void handleBook(slot)}
              />
            ))
          )}
        </>
      )}

      {/* ─── Mes rendez-vous ─── */}
      <SectionTitle>Mes rendez-vous</SectionTitle>

      {mine.isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 8 }} />
      ) : mine.isError ? (
        <View style={{ alignItems: 'center', paddingVertical: 16, gap: 12 }}>
          <Text style={{ color: colors.status.danger500, fontSize: 14 }}>Erreur de chargement.</Text>
          <View style={{ width: 160 }}>
            <Button label="Réessayer" variant="secondary" onPress={() => void mine.refetch()} />
          </View>
        </View>
      ) : myAppointments.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          title="Aucun rendez-vous"
          description="Vos rendez-vous demandés apparaîtront ici avec leur statut."
        />
      ) : (
        myAppointments.map((appt) => <AppointmentRow key={appt.id} appt={appt} />)
      )}
    </ScrollView>
  );
}

function SlotRow({
  slot,
  disabled,
  busy,
  onBook,
}: {
  slot: AppointmentSlot;
  disabled: boolean;
  busy: boolean;
  onBook: () => void;
}) {
  const label = formatSlotRange(slot.startsAt, slot.endsAt);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        padding: 14,
        marginBottom: 10,
        opacity: disabled && !busy ? 0.6 : 1,
      }}
    >
      <Ionicons name="time-outline" size={20} color={ACCENT} />
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
      <Pressable
        onPress={onBook}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy }}
        accessibilityLabel={`Réserver le créneau ${label}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: colors.teal[50],
          borderWidth: 1,
          borderColor: colors.teal[100],
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={ACCENT} />
        ) : (
          <Ionicons name="add" size={16} color={ACCENT} />
        )}
        <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>Réserver</Text>
      </Pressable>
    </View>
  );
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  const label = formatSlotRange(appt.slot.startsAt, appt.slot.endsAt);
  const statusColor = appointmentStatusColor(appt.status);
  const statusText = appointmentStatusLabel(appt.status);
  return (
    <View
      accessibilityLabel={`${label}. ${statusText}.`}
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        padding: 14,
        marginBottom: 10,
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
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.ink[300],
        marginTop: 20,
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}
