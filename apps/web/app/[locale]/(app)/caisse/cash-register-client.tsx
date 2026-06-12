'use client';

import { useMemo, useState } from 'react';

import {
  useCurrentSession,
  formatTnd,
  formatDateTime,
  MOVEMENT_KIND_LABELS,
  type CashSession,
  type CloseSessionResult,
} from '@/lib/api/cash-register';
import { OpenSessionModal } from './open-session-modal';
import { AddMovementModal } from './add-movement-modal';
import { CloseSessionModal } from './close-session-modal';

function sumByKind(session: CashSession, kind: 'INCOME' | 'EXPENSE'): number {
  return session.movements
    .filter((m) => m.kind === kind)
    .reduce((acc, m) => acc + m.amount, 0);
}

export function CashRegisterClient() {
  const { data, isLoading, isError, refetch } = useCurrentSession();

  const [openOpen, setOpenOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeResult, setCloseResult] = useState<CloseSessionResult | null>(null);

  const totals = useMemo(() => {
    if (!data) return null;
    return {
      income: sumByKind(data, 'INCOME'),
      expense: sumByKind(data, 'EXPENSE'),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Chargement de la caisse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
        <p className="text-sm text-rose-700 dark:text-rose-300">
          Impossible de charger la caisse.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // No open session → invitation to open.
  if (!data) {
    return (
      <>
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune caisse ouverte pour le moment.
          </p>
          <button
            type="button"
            onClick={() => setOpenOpen(true)}
            className="mt-4 inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
          >
            Ouvrir la caisse
          </button>
        </div>
        <OpenSessionModal open={openOpen} onClose={() => setOpenOpen(false)} />
      </>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Fond de caisse" value={formatTnd(data.openingFloat)} />
        <SummaryCard
          label="Total entrées"
          value={formatTnd(totals?.income ?? 0)}
          tone="positive"
        />
        <SummaryCard
          label="Total sorties"
          value={formatTnd(totals?.expense ?? 0)}
          tone="negative"
        />
        <SummaryCard
          label="Solde attendu"
          value={formatTnd(data.liveExpected)}
          tone="accent"
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => setMovementOpen(true)}
          className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
        >
          + Ajouter un mouvement
        </button>
        <button
          type="button"
          onClick={() => setCloseOpen(true)}
          className="inline-flex h-10 items-center rounded-md border border-navy-700 px-4 text-sm font-semibold text-navy-700 hover:bg-navy-50 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
        >
          Clôturer la caisse
        </button>
      </div>

      {/* Movements ribbon */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mouvements du jour
        </h2>
        {data.movements.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun mouvement enregistré pour l&apos;instant.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border bg-card">
            {data.movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.kind === 'INCOME'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                    }`}
                  >
                    {MOVEMENT_KIND_LABELS[m.kind]}
                  </span>
                  <span
                    className={`whitespace-nowrap text-sm font-semibold tabular-nums ${
                      m.kind === 'INCOME' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {m.kind === 'INCOME' ? '+' : '−'}
                    {formatTnd(m.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddMovementModal
        open={movementOpen}
        sessionId={data.id}
        onClose={() => setMovementOpen(false)}
      />
      <CloseSessionModal
        open={closeOpen}
        sessionId={data.id}
        expected={data.liveExpected}
        onClose={() => setCloseOpen(false)}
        onClosed={(result) => {
          setCloseOpen(false);
          setCloseResult(result);
        }}
      />

      {/* Closure result modal */}
      {closeResult && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="closure-result-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="closure-result-title" className="text-lg font-semibold">
              Caisse clôturée
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Solde attendu</dt>
                <dd className="font-medium tabular-nums">{formatTnd(closeResult.expectedAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Montant compté</dt>
                <dd className="font-medium tabular-nums">{formatTnd(closeResult.countedAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium">Écart</dt>
                <dd
                  className={`font-semibold tabular-nums ${
                    closeResult.variance !== 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {closeResult.variance > 0 ? '+' : ''}
                  {formatTnd(closeResult.variance)}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setCloseResult(null)}
                className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'accent';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'negative'
        ? 'text-rose-700 dark:text-rose-300'
        : tone === 'accent'
          ? 'text-navy-700 dark:text-white'
          : 'text-foreground';
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
