import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, FormField, colors, radius } from '@klasso/ui-mobile';
import {
  fetchAttendance,
  saveAttendanceBulk,
  type AttendanceStatus,
} from '@/lib/api/attendance';
import { listStudents } from '@/lib/api/students';
import { useClassDetail } from '@/lib/api/classes';

/**
 * Lot 2 — Pointage de présence d'une classe pour une date (admin + enseignant).
 * Charge le roster + l'existant, par défaut tout le monde « présent ».
 */
const STATUSES: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'PRESENT', label: 'Présent', color: colors.status.success500 },
  { value: 'ABSENT', label: 'Absent', color: colors.status.danger500 },
  { value: 'LATE', label: 'Retard', color: colors.ambre[600] },
  { value: 'EXCUSED', label: 'Excusé', color: colors.ink[500] },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id!;
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);

  const { data: cls } = useClassDetail(classId);

  const roster = useQuery({
    queryKey: ['attendance-roster', classId],
    queryFn: () => listStudents({ classId, pageSize: 200 }),
    enabled: !!classId,
  });

  const existing = useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => fetchAttendance(classId, date),
    enabled: !!classId && DATE_RE.test(date),
  });

  const students = useMemo(() => roster.data?.items ?? [], [roster.data]);

  // Seed marks: existing record wins, otherwise default PRESENT.
  useEffect(() => {
    if (!students.length) return;
    const byStudent = new Map((existing.data?.items ?? []).map((r) => [r.studentId, r.status]));
    const next: Record<string, AttendanceStatus> = {};
    for (const s of students) next[s.id] = byStudent.get(s.id) ?? 'PRESENT';
    setMarks(next);
    setSaved(false);
  }, [students, existing.data]);

  const mutation = useMutation({
    mutationFn: () =>
      saveAttendanceBulk(
        classId,
        date,
        students.map((s) => ({ studentId: s.id, status: marks[s.id] ?? 'PRESENT' })),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance', classId, date] });
      setSaved(true);
    },
  });

  const presentCount = Object.values(marks).filter((s) => s === 'PRESENT').length;
  const loading = roster.isLoading || existing.isLoading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink[900] }}>
        {cls?.name ?? 'Classe'}
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 16 }}>
        {students.length} élève{students.length > 1 ? 's' : ''} · {presentCount} présent
        {presentCount > 1 ? 's' : ''}
      </Text>

      <FormField
        label="Date"
        value={date}
        onChangeText={(v) => {
          setDate(v);
          setSaved(false);
        }}
        placeholder="AAAA-MM-JJ"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      {loading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : roster.isError ? (
        <Text style={{ color: colors.status.danger500, marginTop: 16 }}>
          Impossible de charger le roster.
        </Text>
      ) : students.length === 0 ? (
        <Text style={{ color: colors.ink[500], marginTop: 16 }}>
          Aucun élève rattaché à cette classe.
        </Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          {students.map((s) => (
            <View
              key={s.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink[900], marginBottom: 8 }}>
                {s.lastName} {s.firstName}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {STATUSES.map((st) => {
                  const active = (marks[s.id] ?? 'PRESENT') === st.value;
                  return (
                    <Pressable
                      key={st.value}
                      onPress={() => {
                        setMarks((m) => ({ ...m, [s.id]: st.value }));
                        setSaved(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.firstName} : ${st.label}`}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        backgroundColor: active ? st.color : colors.paper[50],
                        borderWidth: 1,
                        borderColor: active ? st.color : colors.paper[100],
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: active ? colors.white : colors.ink[500],
                        }}
                      >
                        {st.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {saved ? (
            <Text style={{ color: colors.status.success500, fontWeight: '600', marginVertical: 8 }}>
              ✓ Appel enregistré.
            </Text>
          ) : null}
          {mutation.error ? (
            <Text style={{ color: colors.status.danger500, marginVertical: 8 }}>
              Erreur : {(mutation.error as Error).message}
            </Text>
          ) : null}

          <View style={{ marginTop: 8 }}>
            <Button
              label="Enregistrer l'appel"
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!DATE_RE.test(date)}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
