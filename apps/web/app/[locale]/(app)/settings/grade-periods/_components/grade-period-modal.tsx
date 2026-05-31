'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface GradePeriodFormValues {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface Props {
  open: boolean;
  initial?: GradePeriodFormValues;
  onClose: () => void;
  onSubmit: (values: GradePeriodFormValues) => Promise<void>;
}

const EMPTY: GradePeriodFormValues = { name: '', startDate: '', endDate: '' };

/** Modal dialog for creating / editing a grade period (trimester). */
export function GradePeriodModal({ open, initial, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<GradePeriodFormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setValues(initial ?? EMPTY);
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  function set<K extends keyof GradePeriodFormValues>(
    k: K,
    v: GradePeriodFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = values.name.trim();
    if (!name) { setError('Le nom de la période est obligatoire.'); return; }
    if (!values.startDate) { setError('La date de début est obligatoire.'); return; }
    if (!values.endDate) { setError('La date de fin est obligatoire.'); return; }
    if (values.endDate <= values.startDate) {
      setError('La date de fin doit être postérieure à la date de début.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({ name, startDate: values.startDate, endDate: values.endDate });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? 'Modifier la période' : 'Nouvelle période'}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-navy-900 px-6 py-4">
          <h2 className="text-base font-semibold text-white">
            {initial ? 'Modifier la période' : 'Nouvelle période'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-navy-400 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="gp-name">Nom de la période *</Label>
            <Input
              id="gp-name"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="ex. 1er Trimestre"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gp-start">Date de début *</Label>
              <Input
                id="gp-start"
                type="date"
                value={values.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gp-end">Date de fin *</Label>
              <Input
                id="gp-end"
                type="date"
                value={values.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-ambre-500 hover:bg-ambre-600 text-white"
            >
              {pending ? 'Enregistrement…' : initial ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
