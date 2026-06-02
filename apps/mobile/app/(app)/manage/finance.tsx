import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
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
  BILLING_KEYS,
  createInvoice,
  formatAmount,
  recordPayment,
  statusLabel,
  useBillingStats,
  useInvoices,
  type Invoice,
  type InvoiceStatus,
} from '@/lib/api/billing';
import { listStudents } from '@/lib/api/students';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  PENDING: '#d97706',
  PARTIAL: '#0ea5e9',
  PAID: '#059669',
  OVERDUE: '#ef4444',
  CANCELLED: '#94a3b8',
};

const METHOD_OPTIONS: PickerOption[] = [
  { value: 'cash', label: 'Espèces' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'card', label: 'Carte' },
];

function inThirtyDays(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function ManageFinanceScreen() {
  const qc = useQueryClient();
  const stats = useBillingStats();
  const { data, isLoading, isError } = useInvoices();
  const { data: studentsData } = useQuery({
    queryKey: ['students', 'finance-picker'],
    queryFn: () => listStudents({ pageSize: 200 }),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [payFor, setPayFor] = useState<Invoice | null>(null);

  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(inThirtyDays());
  const [label, setLabel] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [payErr, setPayErr] = useState<Record<string, string>>({});

  const invoices = data?.items ?? [];
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
      createInvoice({
        studentId: studentId || undefined,
        title: title.trim(),
        dueDate,
        items: [{ label: label.trim(), quantity: parseInt(quantity, 10) || 1, unitPrice: parseFloat(unitPrice) || 0 }],
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BILLING_KEYS.invoices });
      void qc.invalidateQueries({ queryKey: BILLING_KEYS.stats });
      setCreateOpen(false);
      setStudentId('');
      setTitle('');
      setLabel('');
      setUnitPrice('');
      setQuantity('1');
      setErrors({});
    },
  });

  const payM = useMutation({
    mutationFn: () => recordPayment(payFor!.id, { amount: parseFloat(amount), method }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BILLING_KEYS.invoices });
      void qc.invalidateQueries({ queryKey: BILLING_KEYS.stats });
      setPayFor(null);
      setAmount('');
      setPayErr({});
    },
  });

  function submitCreate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Titre requis';
    if (!label.trim()) e.label = 'Libellé requis';
    if (!(parseFloat(unitPrice) > 0)) e.unitPrice = 'Montant invalide';
    if (!DATE_RE.test(dueDate)) e.dueDate = 'Format AAAA-MM-JJ';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  function submitPay() {
    const e: Record<string, string> = {};
    if (!(parseFloat(amount) > 0)) e.amount = 'Montant invalide';
    setPayErr(e);
    if (Object.keys(e).length) return;
    payM.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {/* Stats */}
        {stats.data ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <StatCard label="Facturé" value={formatAmount(stats.data.totalBilled)} color="#0ea5e9" />
            <StatCard label="Encaissé" value={formatAmount(stats.data.totalPaid)} color="#059669" />
            <StatCard label="En attente" value={formatAmount(stats.data.totalPending)} color="#d97706" />
            <StatCard label="En retard" value={formatAmount(stats.data.totalOverdue)} color="#ef4444" />
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
        ) : invoices.length === 0 ? (
          <EmptyState icon="card-outline" title="Aucune facture" description="Créez-en une avec le bouton +." />
        ) : (
          invoices.map((inv) => (
            <View
              key={inv.id}
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
                  {inv.title}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: STATUS_COLOR[inv.status] + '18',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: STATUS_COLOR[inv.status] }}>
                    {statusLabel(inv.status)}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 4 }}>
                {formatAmount(inv.amount, inv.currency)} · échéance {inv.dueDate.slice(0, 10)}
              </Text>
              {inv.status !== 'PAID' && inv.status !== 'CANCELLED' ? (
                <Pressable
                  onPress={() => {
                    setPayFor(inv);
                    setAmount(String(inv.amount));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Encaisser un paiement pour ${inv.title}`}
                  style={{
                    marginTop: 12,
                    paddingVertical: 9,
                    borderRadius: radius.md,
                    backgroundColor: colors.ambre[50],
                    borderWidth: 1,
                    borderColor: colors.ambre[100],
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ambre[700] }}>
                    Encaisser un paiement
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouvelle facture" extended onPress={() => setCreateOpen(true)} />

      {/* Create invoice */}
      <FormSheet
        visible={createOpen}
        title="Nouvelle facture"
        onClose={() => setCreateOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setCreateOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Créer" onPress={submitCreate} loading={createM.isPending} />
            </View>
          </View>
        }
      >
        <FormField label="Titre" required value={title} onChangeText={setTitle} error={errors.title} placeholder="Scolarité janvier" />
        <Picker
          label="Élève"
          value={studentId}
          onChange={setStudentId}
          options={studentOptions}
          placeholder="(optionnel) rattacher un élève…"
        />
        <FormField label="Libellé de la ligne" required value={label} onChangeText={setLabel} error={errors.label} placeholder="Frais de scolarité" />
        <FormField
          label="Quantité"
          value={quantity}
          onChangeText={(v) => setQuantity(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />
        <FormField
          label="Prix unitaire"
          required
          value={unitPrice}
          onChangeText={(v) => setUnitPrice(v.replace(/[^0-9.]/g, ''))}
          error={errors.unitPrice}
          keyboardType="decimal-pad"
        />
        <FormField
          label="Échéance"
          required
          value={dueDate}
          onChangeText={setDueDate}
          error={errors.dueDate}
          placeholder="AAAA-MM-JJ"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      {/* Record payment */}
      <FormSheet
        visible={!!payFor}
        title="Encaisser un paiement"
        onClose={() => setPayFor(null)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setPayFor(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Valider" onPress={submitPay} loading={payM.isPending} />
            </View>
          </View>
        }
      >
        <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 12 }}>
          {payFor?.title} — {payFor ? formatAmount(payFor.amount, payFor.currency) : ''}
        </Text>
        <FormField
          label="Montant"
          required
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
          error={payErr.amount}
          keyboardType="decimal-pad"
        />
        <Picker label="Moyen de paiement" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
        {payM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(payM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View
      style={{
        width: '47.5%',
        flexGrow: 1,
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        padding: 12,
      }}
    >
      <Text style={{ fontSize: 11, color: colors.ink[500] }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '800', color, marginTop: 4 }}>{value}</Text>
    </View>
  );
}
