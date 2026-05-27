'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  recordPayment,
  type Invoice,
  type RecordPaymentInput,
  BillingApiError,
  formatAmount,
} from '@/lib/api/billing';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'konnect', label: 'Konnect' },
] as const;

function calcPaid(invoice: Invoice): number {
  if (!invoice.payments?.length) return 0;
  return invoice.payments.reduce((s, p) => s + p.amount, 0);
}

export function RecordPaymentModal({ invoice, onClose }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: RecordPaymentInput) =>
      recordPayment(accessToken!, invoice!.id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing-invoices'] });
      void qc.invalidateQueries({ queryKey: ['billing-stats'] });
      handleClose();
    },
    onError: (err) => {
      setError(err instanceof BillingApiError ? err.message : 'Une erreur est survenue.');
    },
  });

  function handleClose() {
    setAmount('');
    setMethod('cash');
    setReference('');
    setNotes('');
    setError(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError('Montant invalide.');
      return;
    }
    mutation.mutate({
      amount: parsed,
      method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  if (!invoice) return null;

  const alreadyPaid = calcPaid(invoice);
  const remaining = Math.max(0, invoice.amount - alreadyPaid);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="record-payment-title" className="text-lg font-semibold">
            Enregistrer un paiement
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer la modale"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Invoice summary */}
          <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-navy-900/40">
            <p className="font-medium">{invoice.title}</p>
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>Total : {formatAmount(invoice.amount, invoice.currency)}</span>
              <span>Payé : {formatAmount(alreadyPaid, invoice.currency)}</span>
            </div>
            <p className="mt-1 font-semibold text-navy-700 dark:text-amber-400">
              Reste à payer : {formatAmount(remaining, invoice.currency)}
            </p>
          </div>

          <div className="space-y-4">
            {/* Amount */}
            <div>
              <label htmlFor="pay-amount" className="mb-1 block text-sm font-medium">
                Montant <span aria-hidden="true">*</span>
              </label>
              <input
                id="pay-amount"
                type="number"
                required
                min={0.001}
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`max. ${remaining.toLocaleString('fr-TN')}`}
                className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>

            {/* Method */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Mode de paiement</legend>
              <div className="flex flex-wrap gap-3">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      method === m.value
                        ? 'border-navy-600 bg-navy-50 font-semibold text-navy-700 dark:bg-navy-700/40 dark:text-white'
                        : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pay-method"
                      value={m.value}
                      checked={method === m.value}
                      onChange={() => setMethod(m.value)}
                      className="sr-only"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Reference */}
            <div>
              <label htmlFor="pay-ref" className="mb-1 block text-sm font-medium">
                Référence{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <input
                id="pay-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="ex. CHQ-2025-001"
                className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="pay-notes" className="mb-1 block text-sm font-medium">
                Notes{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                id="pay-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-rose-600">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Enregistrement…' : 'Valider le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
