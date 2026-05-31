'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface SubjectFormValues {
  name: string;
  emoji: string;
  coefficient: number;
  levels: string[];
}

interface Props {
  open: boolean;
  initial?: SubjectFormValues;
  onClose: () => void;
  onSubmit: (values: SubjectFormValues) => Promise<void>;
}

const EMPTY: SubjectFormValues = { name: '', emoji: '', coefficient: 1, levels: [] };

/** "CP, CE1 , CM2" -> ["CP","CE1","CM2"] (trim + dédup + non vides). */
function parseLevels(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const v = part.trim();
    if (v) seen.add(v);
  }
  return [...seen];
}

/** Modal dialog for creating / editing a subject. */
export function SubjectModal({ open, initial, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<SubjectFormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setValues(initial ?? EMPTY);
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  function set<K extends keyof SubjectFormValues>(k: K, v: SubjectFormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = values.name.trim();
    if (!name) { setError('Le nom de la matière est obligatoire.'); return; }
    const coefficient = Number(values.coefficient);
    if (!Number.isFinite(coefficient) || coefficient < 1 || coefficient > 10) {
      setError('Le coefficient doit être compris entre 1 et 10.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({ name, emoji: values.emoji.trim(), coefficient, levels: values.levels });
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
      aria-label={initial ? 'Modifier la matière' : 'Nouvelle matière'}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-navy-900 px-6 py-4">
          <h2 className="text-base font-semibold text-white">
            {initial ? 'Modifier la matière' : 'Nouvelle matière'}
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
            <Label htmlFor="subject-name">Nom de la matière *</Label>
            <Input
              id="subject-name"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="ex. Mathématiques"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject-emoji">Emoji (facultatif)</Label>
            <Input
              id="subject-emoji"
              value={values.emoji}
              onChange={(e) => set('emoji', e.target.value)}
              placeholder="ex. 📐"
              maxLength={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject-coeff">Coefficient (1 – 10)</Label>
            <Input
              id="subject-coeff"
              type="number"
              min={1}
              max={10}
              step={1}
              value={values.coefficient}
              onChange={(e) => set('coefficient', Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject-levels">Niveaux concernés (facultatif)</Label>
            <Input
              id="subject-levels"
              defaultValue={values.levels.join(', ')}
              onChange={(e) => set('levels', parseLevels(e.target.value))}
              placeholder="ex. CP, CE1, CE2 — vide = tous niveaux"
            />
            <p className="text-xs text-muted-foreground">
              Séparez par des virgules. Laissez vide pour appliquer à tous les niveaux.
            </p>
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
