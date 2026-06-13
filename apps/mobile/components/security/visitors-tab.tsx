import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, ConfirmDialog, EmptyState, Fab, FormField, FormSheet, colors, radius } from '@klasso/ui-mobile';
import {
  VISITOR_LOGS_KEY,
  createVisitorLog,
  deleteVisitorLog,
  listVisitorLogs,
  type VisitorLog,
} from '@/lib/api/security';

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export function VisitorsTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: VISITOR_LOGS_KEY, queryFn: listVisitorLogs });
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<VisitorLog | null>(null);

  const [visitorName, setVisitorName] = useState('');
  const [reason, setReason] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  const createM = useMutation({
    mutationFn: () =>
      createVisitorLog({
        visitorName: visitorName.trim(),
        reason: reason.trim() || undefined,
        badgeNumber: badgeNumber.trim() || undefined,
        checkInAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: VISITOR_LOGS_KEY });
      setOpen(false);
      setVisitorName('');
      setReason('');
      setBadgeNumber('');
      setErrors({});
    },
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteVisitorLog(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: VISITOR_LOGS_KEY });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!visitorName.trim()) e.visitorName = 'Nom requis';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
        ) : items.length === 0 ? (
          <EmptyState icon="person-outline" title="Aucun visiteur" description="Enregistrez une entrée avec +." />
        ) : (
          items.map((v) => (
            <View key={v.id} style={{ backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.paper[100], padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>{v.visitorName}</Text>
                <Pressable onPress={() => setToDelete(v)} hitSlop={6}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.status.danger500 }}>Suppr.</Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 4 }}>
                Entrée {fmt(v.checkInAt)}
                {v.badgeNumber ? ` · badge ${v.badgeNumber}` : ''}
                {v.checkOutAt ? ` · sortie ${fmt(v.checkOutAt)}` : ''}
              </Text>
              {v.reason ? <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 4 }}>{v.reason}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouveau visiteur" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Entrée visiteur"
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} /></View>
            <View style={{ flex: 1 }}><Button label="Enregistrer" onPress={submit} loading={createM.isPending} /></View>
          </View>
        }
      >
        <FormField label="Nom du visiteur" required value={visitorName} onChangeText={setVisitorName} error={errors.visitorName} placeholder="Mme Dupont" />
        <FormField label="Motif" value={reason} onChangeText={setReason} placeholder="RDV direction…" />
        <FormField label="N° de badge" value={badgeNumber} onChangeText={setBadgeNumber} placeholder="Optionnel" />
        <Text style={{ fontSize: 12, color: colors.ink[300] }}>L&apos;heure d&apos;entrée est enregistrée automatiquement.</Text>
        {createM.error ? <Text style={{ fontSize: 13, color: colors.status.danger500 }}>Erreur : {(createM.error as Error).message}</Text> : null}
      </FormSheet>

      <ConfirmDialog visible={!!toDelete} title="Supprimer cette entrée ?" message={toDelete?.visitorName ?? ''} confirmLabel="Supprimer" destructive loading={deleteM.isPending} onConfirm={() => toDelete && deleteM.mutate(toDelete.id)} onCancel={() => setToDelete(null)} />
    </View>
  );
}
