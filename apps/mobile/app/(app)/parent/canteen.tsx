import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, Picker, colors, radius } from '@klasso/ui-mobile';
import {
  toDateKey,
  useCancelReservation,
  useReservations,
  useReserve,
  type CanteenReservation,
} from '@/lib/api/canteen';
import { useMyChildren, type MyChild } from '@/lib/api/parent';

const DAYS_AHEAD = 7;
const ACCENT = colors.teal[600];

interface DayInfo {
  /** Clé YYYY-MM-DD (envoyée à l'API). */
  key: string;
  /** Libellé jour, ex. « lun. 16 juin ». */
  label: string;
  isToday: boolean;
  isWeekend: boolean;
}

/** Construit les ~7 prochains jours à partir d'aujourd'hui (UTC pour la clé). */
function buildDays(count: number): DayInfo[] {
  const days: DayInfo[] = [];
  const now = new Date();
  const todayKey = toDateKey(now);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    const key = toDateKey(d);
    const weekday = d.getUTCDay();
    days.push({
      key,
      label: d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'long',
        timeZone: 'UTC',
      }),
      isToday: key === todayKey,
      isWeekend: weekday === 0 || weekday === 6,
    });
  }
  return days;
}

/**
 * G4 — Cantine (parent). Réservation/annulation des repas pour ses enfants sur
 * les 7 prochains jours. Le serveur scope tout au parent connecté.
 */
export default function ParentCanteenScreen() {
  const children = useMyChildren();
  const kids = children.data ?? [];

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const days = useMemo(() => buildDays(DAYS_AHEAD), []);
  const window = useMemo(
    () => ({ from: days[0]?.key ?? '', to: days[days.length - 1]?.key ?? '' }),
    [days],
  );

  // Sélection effective : explicite, sinon premier enfant.
  const activeChildId = selectedChildId ?? kids[0]?.id ?? null;
  const activeChild = kids.find((c) => c.id === activeChildId) ?? null;

  const reservations = useReservations(
    activeChildId ? { studentId: activeChildId, from: window.from, to: window.to } : null,
  );
  const reserve = useReserve();
  const cancel = useCancelReservation();

  const byDay = useMemo(() => {
    const map = new Map<string, CanteenReservation>();
    for (const r of reservations.data ?? []) {
      map.set(toDateKey(r.date), r);
    }
    return map;
  }, [reservations.data]);

  const isMutating = reserve.isPending || cancel.isPending;

  function flash(message: string) {
    setBanner(message);
  }

  async function handleToggle(day: DayInfo, current: CanteenReservation | undefined) {
    if (!activeChildId || isMutating) return;
    setBanner(null);
    const isReserved = current?.status === 'RESERVED';
    try {
      if (isReserved && current) {
        await cancel.mutateAsync({ id: current.id, studentId: activeChildId });
        flash(`Repas annulé pour ${day.label}.`);
      } else {
        await reserve.mutateAsync({ studentId: activeChildId, date: day.key });
        flash(`Repas réservé pour ${day.label}.`);
      }
    } catch {
      flash('Action impossible. Réessayez.');
    }
  }

  if (children.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50], paddingTop: 32 }}>
        <ActivityIndicator color={colors.ambre[500]} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {kids.length === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="Aucun enfant"
          description="Aucun enfant n'est rattaché à votre compte."
        />
      ) : (
        <>
          {/* Sélecteur d'enfant (si plusieurs) */}
          {kids.length > 1 ? (
            <Picker
              label="Enfant"
              value={activeChildId ?? ''}
              onChange={(v) => {
                setSelectedChildId(v);
                setBanner(null);
              }}
              options={kids.map((c: MyChild) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName}`,
                hint: c.className ?? undefined,
              }))}
            />
          ) : (
            <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 12 }}>
              Repas de {activeChild ? `${activeChild.firstName} ${activeChild.lastName}` : ''}
            </Text>
          )}

          {/* Bannière de succès / feedback (cross-platform, pas d'Alert) */}
          {banner ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.teal[50],
                borderWidth: 1,
                borderColor: colors.teal[100],
                borderRadius: radius.md,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
              <Text style={{ flex: 1, fontSize: 13, color: colors.ink[700] }}>{banner}</Text>
            </View>
          ) : null}

          {reservations.isLoading ? (
            <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
          ) : reservations.isError ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }}>
              <Text style={{ color: colors.status.danger500, fontSize: 14 }}>
                Erreur de chargement.
              </Text>
              <View style={{ width: 160 }}>
                <Button
                  label="Réessayer"
                  variant="secondary"
                  onPress={() => void reservations.refetch()}
                />
              </View>
            </View>
          ) : (
            days.map((day) => {
              const current = byDay.get(day.key);
              const isReserved = current?.status === 'RESERVED';
              const isServed = current?.status === 'SERVED';
              return (
                <DayRow
                  key={day.key}
                  day={day}
                  isReserved={isReserved}
                  isServed={isServed}
                  disabled={isMutating || isServed}
                  onToggle={() => void handleToggle(day, current)}
                />
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

function DayRow({
  day,
  isReserved,
  isServed,
  disabled,
  onToggle,
}: {
  day: DayInfo;
  isReserved: boolean;
  isServed: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const statusLabel = isServed ? 'Servi' : isReserved ? 'Réservé' : 'Non réservé';
  const a11y = `${day.label}. ${statusLabel}.${
    isServed ? '' : isReserved ? ' Appuyer pour annuler.' : ' Appuyer pour réserver.'
  }`;
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ checked: isReserved, disabled }}
      accessibilityLabel={a11y}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: isReserved ? colors.teal[100] : colors.paper[100],
        padding: 14,
        marginBottom: 10,
        opacity: disabled && !isServed ? 0.6 : 1,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: colors.ink[900],
            textTransform: 'capitalize',
          }}
        >
          {day.label}
          {day.isToday ? (
            <Text style={{ color: ACCENT, fontWeight: '700' }}>  · aujourd&apos;hui</Text>
          ) : null}
        </Text>
        <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>{statusLabel}</Text>
      </View>

      {isServed ? (
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: colors.status.success100,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.status.success500 }}>
            Servi
          </Text>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: isReserved ? colors.teal[50] : colors.ambre[50],
            borderWidth: 1,
            borderColor: isReserved ? colors.teal[100] : colors.ambre[100],
          }}
        >
          <Ionicons
            name={isReserved ? 'checkmark' : 'add'}
            size={16}
            color={isReserved ? ACCENT : colors.ambre[600]}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: isReserved ? ACCENT : colors.ambre[600],
            }}
          >
            {isReserved ? 'Annuler' : 'Réserver'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
