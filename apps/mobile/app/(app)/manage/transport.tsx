import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  ConfirmDialog,
  EmptyState,
  Fab,
  FormField,
  FormSheet,
  colors,
  radius,
} from '@klasso/ui-mobile';
import {
  BUS_ROUTES_KEY,
  createBusRoute,
  deleteBusRoute,
  useBusRoutes,
  type BusRoute,
} from '@/lib/api/transport';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function ManageTransportScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useBusRoutes();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<BusRoute | null>(null);

  const [name, setName] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  const createM = useMutation({
    mutationFn: () =>
      createBusRoute({
        name: name.trim(),
        departureTime,
        returnTime: returnTime || undefined,
        driverName: driverName || undefined,
        driverPhone: driverPhone || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BUS_ROUTES_KEY });
      setOpen(false);
      setName('');
      setDepartureTime('');
      setReturnTime('');
      setDriverName('');
      setDriverPhone('');
      setErrors({});
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteBusRoute(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BUS_ROUTES_KEY });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nom requis';
    if (!TIME_RE.test(departureTime)) e.departureTime = 'Format HH:MM';
    if (returnTime && !TIME_RE.test(returnTime)) e.returnTime = 'Format HH:MM';
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
          <EmptyState icon="bus-outline" title="Aucune ligne" description="Ajoutez une ligne de bus avec +." />
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
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>{r.name}</Text>
                <Pressable
                  onPress={() => setToDelete(r)}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${r.name}`}
                  hitSlop={8}
                >
                  <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>Suppr.</Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 4 }}>
                Départ {r.departureTime}
                {r.returnTime ? ` · retour ${r.returnTime}` : ''}
                {r.driverName ? ` · ${r.driverName}` : ''}
              </Text>
              <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 2 }}>
                {r.assignmentCount} élève{r.assignmentCount > 1 ? 's' : ''} · {r.stops.length} arrêt
                {r.stops.length > 1 ? 's' : ''}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouvelle ligne" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Nouvelle ligne de bus"
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Créer" onPress={submit} loading={createM.isPending} />
            </View>
          </View>
        }
      >
        <FormField label="Nom de la ligne" required value={name} onChangeText={setName} error={errors.name} placeholder="Ligne Nord" />
        <FormField
          label="Heure de départ"
          required
          value={departureTime}
          onChangeText={setDepartureTime}
          error={errors.departureTime}
          placeholder="07:15"
          keyboardType="numbers-and-punctuation"
        />
        <FormField
          label="Heure de retour"
          value={returnTime}
          onChangeText={setReturnTime}
          error={errors.returnTime}
          placeholder="16:30"
          keyboardType="numbers-and-punctuation"
        />
        <FormField label="Chauffeur" value={driverName} onChangeText={setDriverName} />
        <FormField label="Téléphone chauffeur" value={driverPhone} onChangeText={setDriverPhone} keyboardType="phone-pad" />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer cette ligne ?"
        message={`${toDelete?.name ?? ''} et ses affectations seront retirées.`}
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}
