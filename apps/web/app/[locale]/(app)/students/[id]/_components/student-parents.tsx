'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  deleteParentRelation,
  listParentRelations,
  type ParentRelation,
  type RelationType,
} from '@/lib/api/parent-relations';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { LinkParentModal } from './link-parent-modal';

interface Props {
  studentId: string;
}

const RELATION_LABELS: Record<RelationType, string> = {
  FATHER: 'Père',
  MOTHER: 'Mère',
  LEGAL_GUARDIAN: 'Tuteur légal',
  OTHER: 'Autre',
};

function ParentAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a2e5a]/10 text-sm font-semibold text-[#1a2e5a]"
    >
      {initial}
    </span>
  );
}

function ConfirmUnlink({
  name,
  onConfirm,
  onCancel,
  pending,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-unlink-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 id="confirm-unlink-title" className="text-base font-semibold text-[#1a2e5a]">
          Délier ce parent ?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Voulez-vous supprimer le lien avec <strong>{name}</strong> ? Cette action est réversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border px-3 text-sm hover:bg-muted/50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="h-9 rounded-md bg-rose-600 px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Suppression…' : 'Délier'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * "Parents / Tuteurs" section on the student detail page.
 * Email-based linking UX with modal + confirmation dialogs.
 */
export function StudentParents({ studentId }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role === 'SCHOOL_ADMIN';
  const qc = useQueryClient();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<ParentRelation | null>(null);

  const queryKey = ['parent-relations', { studentId }] as const;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => listParentRelations(accessToken!, { studentId }),
    enabled: !!accessToken,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteParentRelation(accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setUnlinkTarget(null);
    },
  });

  const items: ParentRelation[] = data?.items ?? [];

  return (
    <>
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1a2e5a]">
              Parents / Tuteurs
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data?.total ?? 0} lien{(data?.total ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-amber-500 px-4 text-sm font-medium text-white transition hover:bg-amber-600"
            >
              + Lier un parent
            </button>
          )}
        </div>

        {isLoading && (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            Chargement…
          </p>
        )}

        {error && (
          <div className="mt-4 flex flex-col items-start gap-2" role="alert">
            <p className="text-sm text-rose-600">Erreur de chargement des parents.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="h-9 rounded-md border border-rose-600/40 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              Réessayer
            </button>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun parent lié à cet élève.
            </p>
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="mt-3 text-sm font-medium text-amber-600 hover:underline"
              >
                + Lier un premier parent
              </button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <ul className="mt-4 divide-y" role="list">
            {items.map((rel) => {
              const fullName =
                `${rel.parent?.firstName ?? ''} ${rel.parent?.lastName ?? ''}`.trim();
              return (
                <li
                  key={rel.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <ParentAvatar name={fullName || 'P'} />
                    <div>
                      <p className="text-sm font-medium text-[#1a2e5a]">
                        {fullName || (
                          <span className="text-muted-foreground">Nom inconnu</span>
                        )}
                        {rel.isPrimaryContact && (
                          <span className="ms-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                            Principal
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {RELATION_LABELS[rel.relationType]}
                        {rel.parent?.email ? ` · ${rel.parent.email}` : ''}
                      </p>
                    </div>
                  </div>

                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => setUnlinkTarget(rel)}
                      className="shrink-0 text-xs text-rose-600 hover:underline"
                      aria-label={`Délier ${fullName}`}
                    >
                      Délier
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showLinkModal && (
        <LinkParentModal
          studentId={studentId}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {unlinkTarget && (
        <ConfirmUnlink
          name={`${unlinkTarget.parent?.firstName ?? ''} ${unlinkTarget.parent?.lastName ?? ''}`.trim()}
          onConfirm={() => deleteMut.mutate(unlinkTarget.id)}
          onCancel={() => setUnlinkTarget(null)}
          pending={deleteMut.isPending}
        />
      )}
    </>
  );
}
