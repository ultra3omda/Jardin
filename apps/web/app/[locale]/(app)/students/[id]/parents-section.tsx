'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  createParentRelation,
  deleteParentRelation,
  listParentRelations,
  type ParentRelation,
  type RelationType,
} from '@/lib/api/parent-relations';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Props {
  studentId: string;
}

const RELATION_LABELS: Record<RelationType, string> = {
  FATHER: 'Père',
  MOTHER: 'Mère',
  LEGAL_GUARDIAN: 'Tuteur légal',
  OTHER: 'Autre',
};

/**
 * V3-A — Section "Parents" sur la page détail élève.
 * Affiche les liens parent existants + formulaire d'ajout (SCHOOL_ADMIN only).
 * Le parent DOIT déjà exister comme User(role=PARENT) dans le tenant — saisie
 * par parentUserId (cuid2). V3-B exposera un picker par email.
 */
export function ParentsSection({ studentId }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role === 'SCHOOL_ADMIN';
  const qc = useQueryClient();

  const queryKey = ['parent-relations', { studentId }];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => listParentRelations(accessToken!, { studentId }),
    enabled: !!accessToken,
  });

  const [parentUserId, setParentUserId] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('MOTHER');
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createParentRelation(accessToken!, {
        parentUserId: parentUserId.trim(),
        studentId,
        relationType,
        isPrimaryContact,
      }),
    onSuccess: () => {
      setParentUserId('');
      setIsPrimaryContact(false);
      setSubmitError(null);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => setSubmitError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteParentRelation(accessToken!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const items: ParentRelation[] = data?.items ?? [];

  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Parents liés</h2>
        <span className="text-xs text-muted-foreground">{data?.total ?? 0} lien(s)</span>
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <p className="mt-4 text-sm text-rose-600" role="alert">
          Erreur de chargement.
        </p>
      )}

      {!isLoading && items.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Aucun parent lié à cet élève.</p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 divide-y">
          {items.map((rel) => (
            <li key={rel.id} className="flex items-start justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {rel.parent?.firstName} {rel.parent?.lastName}
                  {rel.isPrimaryContact && (
                    <span className="ms-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                      Contact principal
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {RELATION_LABELS[rel.relationType]} · {rel.parent?.email}
                </p>
              </div>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(rel.id)}
                  disabled={deleteMut.isPending}
                  className="text-xs text-rose-600 hover:underline disabled:opacity-50"
                  aria-label={`Supprimer le lien avec ${rel.parent?.firstName ?? 'ce parent'}`}
                >
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form
          className="mt-6 space-y-3 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!parentUserId.trim()) {
              setSubmitError('parentUserId requis');
              return;
            }
            createMut.mutate();
          }}
        >
          <p className="text-sm font-medium">Ajouter un parent</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="parentUserId" className="text-xs font-medium">
                Parent User ID (cuid2) *
              </label>
              <input
                id="parentUserId"
                value={parentUserId}
                onChange={(e) => setParentUserId(e.target.value)}
                placeholder="cuid2_xxx"
                className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="relationType" className="text-xs font-medium">
                Type de relation *
              </label>
              <select
                id="relationType"
                value={relationType}
                onChange={(e) => setRelationType(e.target.value as RelationType)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="MOTHER">Mère</option>
                <option value="FATHER">Père</option>
                <option value="LEGAL_GUARDIAN">Tuteur légal</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isPrimaryContact}
              onChange={(e) => setIsPrimaryContact(e.target.checked)}
            />
            Contact principal
          </label>
          {submitError && (
            <p className="text-xs text-rose-600" role="alert">
              {submitError}
            </p>
          )}
          <button
            type="submit"
            disabled={createMut.isPending}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {createMut.isPending ? 'Ajout…' : 'Lier ce parent'}
          </button>
        </form>
      )}
    </section>
  );
}
