'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createInvoice,
  type CreateInvoiceInput,
  type CreateInvoiceItemInput,
  BillingApiError,
} from '@/lib/api/billing';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { StudentPicker } from '@/components/pickers/student-picker';

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY_ITEM: CreateInvoiceItemInput = { label: '', quantity: 1, unitPrice: 0 };

function calcTotal(items: CreateInvoiceItemInput[]): number {
  return items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
}

export function CreateInvoiceModal({ open, onClose }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('TND');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CreateInvoiceItemInput[]>([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateInvoiceInput) => createInvoice(accessToken!, data),
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
    setTitle('');
    setStudentId('');
    setDueDate('');
    setCurrency('TND');
    setNotes('');
    setItems([{ ...EMPTY_ITEM }]);
    setError(null);
    onClose();
  }

  function updateItem(index: number, patch: Partial<CreateInvoiceItemInput>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validItems = items.filter((it) => it.label.trim());
    if (!validItems.length) {
      setError('Ajoutez au moins un article avec un libellé.');
      return;
    }
    mutation.mutate({
      title: title.trim(),
      studentId: studentId.trim() || undefined,
      dueDate,
      currency: currency.trim() || 'TND',
      notes: notes.trim() || undefined,
      items: validItems,
    });
  }

  if (!open) return null;

  const total = calcTotal(items);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-invoice-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="create-invoice-title" className="text-lg font-semibold">
            Nouvelle facture
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

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto p-6"
          style={{ maxHeight: '75vh' }}
        >
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="inv-title" className="mb-1 block text-sm font-medium">
                Titre <span aria-hidden="true">*</span>
              </label>
              <input
                id="inv-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex. Scolarité T1 2025-2026"
                className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>

            {/* Student (searchable) */}
            <div>
              <label htmlFor="inv-student" className="mb-1 block text-sm font-medium">
                Élève{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <StudentPicker id="inv-student" value={studentId} onChange={setStudentId} />
            </div>

            {/* Due date + currency */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="inv-due" className="mb-1 block text-sm font-medium">
                  Échéance <span aria-hidden="true">*</span>
                </label>
                <input
                  id="inv-due"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label htmlFor="inv-currency" className="mb-1 block text-sm font-medium">
                  Devise
                </label>
                <input
                  id="inv-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="TND"
                  maxLength={10}
                  className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
            </div>

            {/* Line items */}
            <div>
              <p className="mb-2 text-sm font-medium">Articles</p>
              <div className="space-y-2">
                {items.map((it, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className="flex gap-2">
                    <input
                      aria-label={`Libellé article ${i + 1}`}
                      value={it.label}
                      onChange={(e) => updateItem(i, { label: e.target.value })}
                      placeholder="Libellé"
                      className="h-9 flex-1 rounded-md border px-2 text-sm"
                    />
                    <input
                      aria-label={`Quantité article ${i + 1}`}
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                      className="h-9 w-16 rounded-md border px-2 text-sm"
                    />
                    <input
                      aria-label={`Prix unitaire article ${i + 1}`}
                      type="number"
                      min={0}
                      step="0.001"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                      placeholder="Prix"
                      className="h-9 w-24 rounded-md border px-2 text-sm"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        aria-label={`Supprimer article ${i + 1}`}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-sm font-medium text-navy-600 hover:underline dark:text-navy-300"
              >
                + Ajouter un article
              </button>
            </div>

            {/* Running total */}
            <div className="rounded-lg bg-gray-50 px-4 py-2 text-right dark:bg-navy-900/40">
              <span className="text-sm text-muted-foreground">Total : </span>
              <span className="font-semibold">
                {total.toLocaleString('fr-TN', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 3,
                })}{' '}
                {currency || 'TND'}
              </span>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="inv-notes" className="mb-1 block text-sm font-medium">
                Notes{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                id="inv-notes"
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
              {mutation.isPending ? 'Enregistrement…' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
