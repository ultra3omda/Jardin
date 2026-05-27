'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  createParentRelation,
  type RelationType,
} from '@/lib/api/parent-relations';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Props {
  studentId: string;
  onClose: () => void;
}

const RELATIONS: { value: RelationType; label: string }[] = [
  { value: 'FATHER', label: 'Père' },
  { value: 'MOTHER', label: 'Mère' },
  { value: 'LEGAL_GUARDIAN', label: 'Tuteur légal' },
  { value: 'OTHER', label: 'Autre' },
];

/**
 * Modal for linking a parent to a student by email.
 * The backend resolves the email → parentUserId lookup.
 */
export function LinkParentModal({ studentId, onClose }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  const [email, setEmail] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('MOTHER');
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createParentRelation(accessToken!, {
        parentEmail: email.trim().toLowerCase(),
        studentId,
        relationType,
        isPrimaryContact,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-relations', { studentId }] });
      onClose();
    },
    onError: (e: Error) => setFormError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setFormError('E-mail requis');
      return;
    }
    setFormError(null);
    mutation.mutate();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-parent-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2
          id="link-parent-title"
          className="text-lg font-semibold text-[#1a2e5a]"
        >
          Lier un parent / tuteur
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez l&apos;e-mail du compte parent à associer à cet élève.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="link-parent-email"
              className="block text-sm font-medium text-[#1a2e5a]"
            >
              E-mail du parent *
            </label>
            <input
              id="link-parent-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@exemple.fr"
              required
              autoFocus
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e5a]/30"
            />
          </div>

          <div>
            <label
              htmlFor="link-relation-type"
              className="block text-sm font-medium text-[#1a2e5a]"
            >
              Rôle *
            </label>
            <select
              id="link-relation-type"
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as RelationType)}
              className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e5a]/30"
            >
              {RELATIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPrimaryContact}
              onChange={(e) => setIsPrimaryContact(e.target.checked)}
              className="rounded border"
            />
            Contact principal
          </label>

          {formError && (
            <p className="text-sm text-rose-600" role="alert">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border px-4 text-sm hover:bg-muted/50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-9 rounded-md bg-amber-500 px-4 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Liaison…' : 'Lier ce parent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
