import { ScrollView, Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

export interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  periodStart: string;
  periodEnd: string;
  subject: string;
  room?: string | null;
  /** Shown under the subject in a teacher (cross-class) view. */
  className?: string | null;
}

interface ScheduleGridProps {
  slots: ScheduleSlot[];
  /** Secondary line under the subject: the class name (teacher view) or the room. */
  secondary?: 'class' | 'room';
}

const DAY_LABELS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const BASE_DAYS = [1, 2, 3, 4, 5];

// Subtle per-subject tint, mirrors the web grid palette (bg / text).
const SUBJECT_COLORS: Record<string, { bg: string; fg: string }> = {
  Mathématiques: { bg: '#dbeafe', fg: '#1e40af' },
  Français: { bg: '#dcfce7', fg: '#166534' },
  Sciences: { bg: '#f3e8ff', fg: '#6b21a8' },
  'Sciences Naturelles': { bg: '#f3e8ff', fg: '#6b21a8' },
  'Éveil scientifique': { bg: '#f3e8ff', fg: '#6b21a8' },
  'Histoire-Géographie': { bg: '#fef9c3', fg: '#854d0e' },
  'Histoire-Géo': { bg: '#fef9c3', fg: '#854d0e' },
  'Éducation Physique': { bg: '#fee2e2', fg: '#991b1b' },
  Sport: { bg: '#fee2e2', fg: '#991b1b' },
  'Arts Plastiques': { bg: '#fce7f3', fg: '#9d174d' },
  Arts: { bg: '#fce7f3', fg: '#9d174d' },
  Musique: { bg: '#e0e7ff', fg: '#3730a3' },
  Éveil: { bg: '#ffedd5', fg: '#9a3412' },
};

function colorFor(subject: string): { bg: string; fg: string } {
  return SUBJECT_COLORS[subject] ?? { bg: colors.paper[100], fg: colors.ink[700] };
}

const TIME_COL = 56;
const DAY_COL = 116;
const ROW_MIN_H = 56;

/**
 * Read-only timetable grid: rows are distinct start times, columns are the
 * week days that carry at least one slot (Mon–Fri minimum). Same layout as the
 * web `/schedule` grid so parents and teachers see one consistent format.
 */
export function ScheduleGrid({ slots, secondary = 'room' }: ScheduleGridProps) {
  const times = [...new Set(slots.map((s) => s.periodStart))].sort();
  const extraDays = [...new Set(slots.map((s) => s.dayOfWeek))]
    .filter((d) => d > 5)
    .sort((a, b) => a - b);
  const days = [...BASE_DAYS, ...extraDays];

  const slotAt = (dow: number, time: string): ScheduleSlot | undefined =>
    slots.find((s) => s.dayOfWeek === dow && s.periodStart === time);

  if (times.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.paper[100],
          borderRadius: radius.lg,
          backgroundColor: colors.white,
          overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.paper[50] }}>
          <View style={{ width: TIME_COL, padding: 8, justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.ink[500] }}>Heure</Text>
          </View>
          {days.map((d) => (
            <View
              key={d}
              style={{
                width: DAY_COL,
                padding: 8,
                alignItems: 'center',
                borderLeftWidth: 1,
                borderLeftColor: colors.paper[100],
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink[700] }}>
                {DAY_LABELS[d] ?? '—'}
              </Text>
            </View>
          ))}
        </View>

        {/* Time rows */}
        {times.map((time) => (
          <View
            key={time}
            style={{
              flexDirection: 'row',
              borderTopWidth: 1,
              borderTopColor: colors.paper[100],
              minHeight: ROW_MIN_H,
            }}
          >
            <View style={{ width: TIME_COL, padding: 6, justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, color: colors.ink[500], fontVariant: ['tabular-nums'] }}>
                {time}
              </Text>
            </View>
            {days.map((d) => {
              const slot = slotAt(d, time);
              const tint = slot ? colorFor(slot.subject) : null;
              return (
                <View
                  key={d}
                  style={{
                    width: DAY_COL,
                    padding: 4,
                    borderLeftWidth: 1,
                    borderLeftColor: colors.paper[100],
                    justifyContent: 'center',
                  }}
                >
                  {slot && tint ? (
                    <View
                      style={{
                        backgroundColor: tint.bg,
                        borderRadius: radius.md,
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: tint.fg }}>
                        {slot.subject}
                      </Text>
                      {secondary === 'class' && slot.className ? (
                        <Text style={{ fontSize: 10, color: tint.fg, opacity: 0.8, marginTop: 1 }}>
                          {slot.className}
                        </Text>
                      ) : null}
                      {slot.room ? (
                        <Text style={{ fontSize: 10, color: tint.fg, opacity: 0.65, marginTop: 1 }}>
                          {slot.room}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 11, color: colors.ink[300], textAlign: 'center' }}>—</Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
