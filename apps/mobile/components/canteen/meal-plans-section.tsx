import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, EmptyState, FormField, FormSheet, colors, radius } from '@klasso/ui-mobile';
import { listStudents } from '@/lib/api/students';
import {
  MEAL_PLANS_KEY,
  MEAL_REGIMES,
  MEAL_REGIME_LABELS,
  createMealPlan,
  deleteMealPlan,
  joinStudentsWithPlans,
  listMealPlans,
  updateMealPlan,
  type MealPlan,
  type MealRegime,
} from '@/lib/api/meal-plans';

interface StudentLite {
  id: string;
  firstName: string;
  lastName: string;
}

/** Régimes alimentaires (1/élève) — gestion admin/personnel sur mobile. */
export function MealPlansSection() {
  const qc = useQueryClient();
  const studentsQuery = useQuery({
    queryKey: ['students', 'picker'] as const,
    queryFn: () => listStudents({ pageSize: 200 }),
  });
  const plansQuery = useQuery({ queryKey: MEAL_PLANS_KEY, queryFn: listMealPlans });

  const students = (studentsQuery.data?.items ?? []) as StudentLite[];
  const rows = joinStudentsWithPlans(students, plansQuery.data?.items ?? []);

  const [editing, setEditing] = useState<{ student: StudentLite; plan: MealPlan | null } | null>(null);
  const [regime, setRegime] = useState<MealRegime>('STANDARD');
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!editing) return;
    setRegime(editing.plan?.regime ?? 'STANDARD');
    setAllergies(editing.plan?.allergies ?? '');
    setNotes(editing.plan?.notes ?? '');
  }, [editing]);

  const settle = () => {
    void qc.invalidateQueries({ queryKey: MEAL_PLANS_KEY });
    setEditing(null);
  };

  const saveM = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('Aucun élève');
      const payload = { regime, allergies: allergies.trim(), notes: notes.trim() };
      return editing.plan
        ? updateMealPlan(editing.plan.id, payload)
        : createMealPlan({ studentId: editing.student.id, ...payload });
    },
    onSuccess: settle,
  });

  const removeM = useMutation({
    mutationFn: () => {
      if (!editing?.plan) throw new Error('Aucun régime');
      return deleteMealPlan(editing.plan.id);
    },
    onSuccess: settle,
  });

  const loading = studentsQuery.isLoading || plansQuery.isLoading;

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <EmptyState icon="people-outline" title="Aucun élève" description="Ajoutez des élèves d'abord." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {rows.map(({ student, plan }) => (
            <Pressable
              key={student.id}
              onPress={() => setEditing({ student, plan })}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
                {student.firstName} {student.lastName}
              </Text>
              <Text style={{ fontSize: 13, color: plan ? colors.ink[700] : colors.ink[300], marginTop: 4 }}>
                {plan ? MEAL_REGIME_LABELS[plan.regime] : 'Régime non défini'}
                {plan?.allergies ? ` · allergies : ${plan.allergies}` : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <FormSheet
        visible={editing !== null}
        title={editing ? `Régime — ${editing.student.firstName}` : ''}
        onClose={() => setEditing(null)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setEditing(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Enregistrer" onPress={() => saveM.mutate()} loading={saveM.isPending} />
            </View>
          </View>
        }
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink[900], marginBottom: 8 }}>
          Régime
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {MEAL_REGIMES.map((r) => {
            const active = regime === r;
            return (
              <Pressable
                key={r}
                onPress={() => setRegime(r)}
                style={{
                  borderWidth: 1,
                  borderColor: active ? colors.ambre[500] : colors.paper[100],
                  backgroundColor: active ? colors.ambre[500] : colors.white,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.white : colors.ink[900] }}>
                  {MEAL_REGIME_LABELS[r]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <FormField label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="Arachides, lactose…" />
        <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Précisions éventuelles" />
        {editing?.plan ? (
          <Pressable onPress={() => removeM.mutate()} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.status.danger500, fontWeight: '600' }}>
              {removeM.isPending ? 'Suppression…' : 'Réinitialiser le régime'}
            </Text>
          </Pressable>
        ) : null}
        {saveM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500, marginTop: 8 }}>
            Erreur : {(saveM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>
    </View>
  );
}
