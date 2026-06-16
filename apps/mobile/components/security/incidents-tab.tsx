import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, ConfirmDialog, EmptyState, ErrorState, Fab, FormField, FormSheet, Picker, Skeleton, colors, radius } from '@klasso/ui-mobile';
import {
  INCIDENT_TYPE_LABELS,
  INCIDENT_TYPE_OPTIONS,
  SECURITY_INCIDENTS_KEY,
  SEVERITY_COLOR,
  SEVERITY_LABELS,
  SEVERITY_OPTIONS,
  createSecurityIncident,
  deleteSecurityIncident,
  listSecurityIncidents,
  resolveSecurityIncident,
  type SecurityIncident,
  type SecurityIncidentType,
  type SecuritySeverity,
} from '@/lib/api/security';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
};

export function IncidentsTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: SECURITY_INCIDENTS_KEY, queryFn: listSecurityIncidents });
  const [open, setOpen] = useState(false);
  const [toResolve, setToResolve] = useState<SecurityIncident | null>(null);
  const [toDelete, setToDelete] = useState<SecurityIncident | null>(null);

  const [type, setType] = useState<SecurityIncidentType>('INTRUSION');
  const [severity, setSeverity] = useState<SecuritySeverity>('MEDIUM');
  const [location, setLocation] = useState('');
  const [occurredAt, setOccurredAt] = useState(today());
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  const createM = useMutation({
    mutationFn: () =>
      createSecurityIncident({
        type,
        severity,
        location: location.trim() || undefined,
        occurredAt: new Date(occurredAt).toISOString(),
        description: description.trim(),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SECURITY_INCIDENTS_KEY });
      setOpen(false);
      setLocation('');
      setOccurredAt(today());
      setDescription('');
      setErrors({});
    },
  });
  const resolveM = useMutation({
    mutationFn: (id: string) => resolveSecurityIncident(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SECURITY_INCIDENTS_KEY });
      setToResolve(null);
    },
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteSecurityIncident(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SECURITY_INCIDENTS_KEY });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!DATE_RE.test(occurredAt)) e.occurredAt = 'Format AAAA-MM-JJ';
    if (!description.trim()) e.description = 'Description requise';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {isLoading ? (
          <View style={{ gap: 10 }} accessibilityRole="progressbar">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={72} radius={radius.lg} />
            ))}
          </View>
        ) : isError ? (
          <ErrorState
            message="Impossible de charger les incidents."
            onRetry={() => {
              void refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="shield-outline" title="Aucun incident" description="Signalez-en un avec +." />
        ) : (
          items.map((i) => (
            <View key={i.id} style={{ backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.paper[100], padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
                  {INCIDENT_TYPE_LABELS[i.type]}
                </Text>
                <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: SEVERITY_COLOR[i.severity] + '22' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: SEVERITY_COLOR[i.severity] }}>
                    {SEVERITY_LABELS[i.severity]}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 4 }}>
                {fmt(i.occurredAt)}{i.location ? ` · ${i.location}` : ''} · {i.status === 'RESOLVED' ? 'Résolu' : 'Ouvert'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 6 }}>{i.description}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                {i.status === 'OPEN' ? (
                  <Pressable onPress={() => setToResolve(i)} hitSlop={6}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#16a34a' }}>Marquer résolu</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setToDelete(i)} hitSlop={6}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.status.danger500 }}>Supprimer</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Signaler" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Nouvel incident"
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} /></View>
            <View style={{ flex: 1 }}><Button label="Signaler" onPress={submit} loading={createM.isPending} /></View>
          </View>
        }
      >
        <Picker label="Type" required value={type} onChange={(v) => setType(v as SecurityIncidentType)} options={INCIDENT_TYPE_OPTIONS} />
        <Picker label="Gravité" required value={severity} onChange={(v) => setSeverity(v as SecuritySeverity)} options={SEVERITY_OPTIONS} />
        <FormField label="Lieu" value={location} onChangeText={setLocation} placeholder="Cour, entrée…" />
        <FormField label="Date" required value={occurredAt} onChangeText={setOccurredAt} error={errors.occurredAt} placeholder="AAAA-MM-JJ" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
        <FormField label="Description" required value={description} onChangeText={setDescription} error={errors.description} placeholder="Ce qui s'est passé…" />
        {createM.error ? <Text style={{ fontSize: 13, color: colors.status.danger500 }}>Erreur : {(createM.error as Error).message}</Text> : null}
      </FormSheet>

      <ConfirmDialog visible={!!toResolve} title="Marquer comme résolu ?" message={toResolve ? INCIDENT_TYPE_LABELS[toResolve.type] : ''} confirmLabel="Résoudre" loading={resolveM.isPending} onConfirm={() => toResolve && resolveM.mutate(toResolve.id)} onCancel={() => setToResolve(null)} />
      <ConfirmDialog visible={!!toDelete} title="Supprimer cet incident ?" message={toDelete ? INCIDENT_TYPE_LABELS[toDelete.type] : ''} confirmLabel="Supprimer" destructive loading={deleteM.isPending} onConfirm={() => toDelete && deleteM.mutate(toDelete.id)} onCancel={() => setToDelete(null)} />
    </View>
  );
}
