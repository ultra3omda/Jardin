import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, Fab, FormField, FormSheet, colors, radius } from '@klasso/ui-mobile';
import {
  createCanteenMenu,
  SCHOOL_LIFE_KEYS,
  useCanteenMenus,
} from '@/lib/api/school-life';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export default function ManageCanteenScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useCanteenMenus();
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(today());
  const [starter, setStarter] = useState('');
  const [main, setMain] = useState('');
  const [dessert, setDessert] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  const createM = useMutation({
    mutationFn: () => createCanteenMenu({ date, starter, main, dessert }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SCHOOL_LIFE_KEYS.canteen });
      setOpen(false);
      setStarter('');
      setMain('');
      setDessert('');
      setErrors({});
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!DATE_RE.test(date)) e.date = 'Format AAAA-MM-JJ';
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
          <EmptyState icon="restaurant-outline" title="Aucun menu" description="Ajoutez le menu du jour avec +." />
        ) : (
          items.map((m) => (
            <View
              key={m.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink[900], textTransform: 'capitalize' }}>
                {fmt(m.date)}
              </Text>
              {m.starter ? <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 4 }}>Entrée : {m.starter}</Text> : null}
              {m.main ? <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 2 }}>Plat : {m.main}</Text> : null}
              {m.dessert ? <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 2 }}>Dessert : {m.dessert}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouveau menu" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Nouveau menu"
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
        <FormField
          label="Date"
          required
          value={date}
          onChangeText={setDate}
          error={errors.date}
          placeholder="AAAA-MM-JJ"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
        <FormField label="Entrée" value={starter} onChangeText={setStarter} placeholder="Salade…" />
        <FormField label="Plat" value={main} onChangeText={setMain} placeholder="Poulet rôti…" />
        <FormField label="Dessert" value={dessert} onChangeText={setDessert} placeholder="Fruit de saison…" />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>
    </View>
  );
}
