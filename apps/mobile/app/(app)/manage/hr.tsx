import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Button,
  ConfirmDialog,
  EmptyState,
  Fab,
  FormField,
  FormSheet,
  Picker,
  colors,
  radius,
  type PickerOption,
} from '@klasso/ui-mobile';
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_OPTIONS,
  HR_CONTRACTS_KEY,
  createContract,
  deleteContract,
  endContract,
  listContracts,
  type ContractType,
  type EmploymentContract,
} from '@/lib/api/hr';
import { useDirectory } from '@/lib/api/staff';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
};

export default function ManageHrScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: HR_CONTRACTS_KEY, queryFn: listContracts });
  const { data: teachers } = useDirectory('teachers');
  const { data: staff } = useDirectory('staff');

  const [open, setOpen] = useState(false);
  const [toEnd, setToEnd] = useState<EmploymentContract | null>(null);
  const [toDelete, setToDelete] = useState<EmploymentContract | null>(null);

  const [userId, setUserId] = useState('');
  const [type, setType] = useState<ContractType>('CDI');
  const [startDate, setStartDate] = useState(today());
  const [baseSalary, setBaseSalary] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const employees = useMemo(
    () => [...(teachers?.items ?? []), ...(staff?.items ?? [])].filter((u) => !u.deletedAt),
    [teachers, staff],
  );
  const employeeOptions = useMemo<PickerOption[]>(
    () => employees.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}`, hint: u.email })),
    [employees],
  );
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((u) => m.set(u.id, `${u.firstName} ${u.lastName}`));
    return m;
  }, [employees]);

  const items = data?.items ?? [];

  function resetForm() {
    setUserId('');
    setType('CDI');
    setStartDate(today());
    setBaseSalary('');
    setWeeklyHours('');
    setNotes('');
    setErrors({});
  }

  const createM = useMutation({
    mutationFn: () =>
      createContract({
        userId,
        type,
        startDate: new Date(startDate).toISOString(),
        baseSalary: Number(baseSalary.replace(',', '.')),
        weeklyHours: weeklyHours ? parseInt(weeklyHours, 10) : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HR_CONTRACTS_KEY });
      setOpen(false);
      resetForm();
    },
  });
  const endM = useMutation({
    mutationFn: (id: string) => endContract(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HR_CONTRACTS_KEY });
      setToEnd(null);
    },
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteContract(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HR_CONTRACTS_KEY });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!userId) e.userId = 'Employé requis';
    if (!DATE_RE.test(startDate)) e.startDate = 'Format AAAA-MM-JJ';
    const salary = Number(baseSalary.replace(',', '.'));
    if (baseSalary.trim() === '' || Number.isNaN(salary) || salary < 0) e.baseSalary = 'Salaire invalide';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
        ) : items.length === 0 ? (
          <EmptyState icon="document-text-outline" title="Aucun contrat" description="Ajoutez un contrat avec le bouton +." />
        ) : (
          items.map((c) => (
            <View
              key={c.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
                  {nameById.get(c.userId) ?? 'Employé'}
                </Text>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    backgroundColor: (c.status === 'ACTIVE' ? '#16a34a' : colors.ink[300]) + '22',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.status === 'ACTIVE' ? '#16a34a' : colors.ink[500] }}>
                    {c.status === 'ACTIVE' ? 'Actif' : 'Terminé'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 4 }}>
                {CONTRACT_TYPE_LABELS[c.type]} · {c.baseSalary} {c.currency} · depuis {fmtDate(c.startDate)}
                {c.weeklyHours ? ` · ${c.weeklyHours}h/sem` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                {c.status === 'ACTIVE' ? (
                  <Pressable onPress={() => setToEnd(c)} hitSlop={6}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ambre[700] }}>Terminer</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setToDelete(c)} hitSlop={6}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.status.danger500 }}>Supprimer</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouveau contrat" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Nouveau contrat"
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} /></View>
            <View style={{ flex: 1 }}><Button label="Créer" onPress={submit} loading={createM.isPending} /></View>
          </View>
        }
      >
        <Picker
          label="Employé"
          required
          value={userId}
          onChange={setUserId}
          options={employeeOptions}
          error={errors.userId}
          placeholder={employeeOptions.length ? 'Choisir…' : 'Aucun employé'}
          disabled={employeeOptions.length === 0}
        />
        <Picker label="Type" required value={type} onChange={(v) => setType(v as ContractType)} options={CONTRACT_TYPE_OPTIONS} />
        <FormField label="Date de début" required value={startDate} onChangeText={setStartDate} error={errors.startDate} placeholder="AAAA-MM-JJ" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
        <FormField label="Salaire de base (TND)" required value={baseSalary} onChangeText={setBaseSalary} error={errors.baseSalary} keyboardType="decimal-pad" placeholder="0.000" />
        <FormField label="Heures / semaine" value={weeklyHours} onChangeText={(v) => setWeeklyHours(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Optionnel" />
        <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optionnel" />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>Erreur : {(createM.error as Error).message}</Text>
        ) : null}
      </FormSheet>

      <ConfirmDialog
        visible={!!toEnd}
        title="Terminer ce contrat ?"
        message={toEnd ? (nameById.get(toEnd.userId) ?? '') : ''}
        confirmLabel="Terminer"
        loading={endM.isPending}
        onConfirm={() => toEnd && endM.mutate(toEnd.id)}
        onCancel={() => setToEnd(null)}
      />
      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer ce contrat ?"
        message={toDelete ? (nameById.get(toDelete.userId) ?? '') : ''}
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}
