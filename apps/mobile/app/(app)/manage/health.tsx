import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

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
  createHealthRecord,
  deleteHealthRecord,
  HEALTH_RECORDS_KEY,
  useHealthRecords,
  type HealthRecord,
} from '@/lib/api/health';
import { listStudents } from '@/lib/api/students';

export default function ManageHealthScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useHealthRecords();
  const { data: studentsData } = useQuery({
    queryKey: ['students', 'health-picker'],
    queryFn: () => listStudents({ pageSize: 200 }),
  });
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<HealthRecord | null>(null);

  const [studentId, setStudentId] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];
  const studentOptions = useMemo<PickerOption[]>(
    () =>
      (studentsData?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.lastName} ${s.firstName}`,
        hint: s.classroom,
      })),
    [studentsData],
  );

  const createM = useMutation({
    mutationFn: () =>
      createHealthRecord({
        studentId,
        bloodType: bloodType || undefined,
        allergies: allergies || undefined,
        medications: medications || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HEALTH_RECORDS_KEY });
      setOpen(false);
      setStudentId('');
      setBloodType('');
      setAllergies('');
      setMedications('');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setErrors({});
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteHealthRecord(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HEALTH_RECORDS_KEY });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!studentId) e.studentId = 'Élève requis';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <Text style={{ fontSize: 12, color: colors.ink[500], marginBottom: 12 }}>
          Données sensibles (RGPD) — accès tracé.
        </Text>
        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
        ) : items.length === 0 ? (
          <EmptyState icon="medkit-outline" title="Aucun dossier" description="Ajoutez un dossier santé avec +." />
        ) : (
          items.map((r) => (
            <View
              key={r.id}
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
                  {r.studentName}
                </Text>
                <Pressable
                  onPress={() => setToDelete(r)}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer le dossier de ${r.studentName}`}
                  hitSlop={8}
                >
                  <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>Suppr.</Text>
                </Pressable>
              </View>
              {r.bloodType ? (
                <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 4 }}>Groupe : {r.bloodType}</Text>
              ) : null}
              {r.allergies ? (
                <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 2 }}>Allergies : {r.allergies}</Text>
              ) : null}
              {r.emergencyContactPhone ? (
                <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 4 }}>
                  Urgence : {r.emergencyContactName ?? ''} {r.emergencyContactPhone}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouveau dossier" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Dossier santé"
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Enregistrer" onPress={submit} loading={createM.isPending} />
            </View>
          </View>
        }
      >
        <Picker
          label="Élève"
          required
          value={studentId}
          onChange={setStudentId}
          options={studentOptions}
          error={errors.studentId}
          placeholder="Choisir un élève…"
        />
        <FormField label="Groupe sanguin" value={bloodType} onChangeText={setBloodType} placeholder="O+" />
        <FormField label="Allergies" value={allergies} onChangeText={setAllergies} multiline />
        <FormField label="Traitements" value={medications} onChangeText={setMedications} multiline />
        <FormField label="Contact d'urgence" value={emergencyContactName} onChangeText={setEmergencyContactName} />
        <FormField
          label="Téléphone d'urgence"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
          keyboardType="phone-pad"
        />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer ce dossier ?"
        message={`Le dossier santé de ${toDelete?.studentName ?? ''} sera supprimé.`}
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}
