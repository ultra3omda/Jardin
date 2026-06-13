'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useResource } from '@/lib/hooks/use-resource';
import { listClasses, type SchoolClass } from '@/lib/api/classes';
import {
  usePromotePreview,
  usePromoteCommit,
  GRADUATED,
  type PromotionMapping,
  type PromotionPreview,
  type PromotionAction,
} from '@/lib/api/class-promotion';
import { useToast } from '@/lib/ui/use-toast';

type WizardStep = 1 | 2 | 3;

const ACTION_LABELS: Record<PromotionAction, string> = {
  PROMOTE: 'Promotion',
  GRADUATE: 'Sortie / Diplômé',
  SKIP: 'Ignorée',
};

const ACTION_BADGE: Record<PromotionAction, string> = {
  PROMOTE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  GRADUATE: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  SKIP: 'bg-slate-100 text-slate-800 dark:bg-navy-900/40 dark:text-slate-200',
};

const PLAN_COLUMNS = ['Classe source', 'Élèves', 'Action', 'Classe cible'];

export function ClassPromotionClient() {
  const user = useAuthStore((s) => s.user);

  // RBAC : le passage de classe est réservé à la direction.
  if (user?.role !== 'SCHOOL_ADMIN') {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
        Accès non autorisé : le passage de classe est réservé à la direction de l&apos;établissement.
      </div>
    );
  }

  return <Wizard />;
}

function Wizard() {
  const toast = useToast();

  const classesQuery = useResource(['class-promotion', 'classes'], (token) => listClasses(token));
  const preview = usePromotePreview();
  const commit = usePromoteCommit();

  const allClasses: SchoolClass[] = useMemo(
    () => classesQuery.data?.items ?? [],
    [classesQuery.data],
  );

  const schoolYears = useMemo(() => {
    const set = new Set<string>();
    for (const c of allClasses) set.add(c.schoolYear);
    return Array.from(set).sort().reverse();
  }, [allClasses]);

  const [step, setStep] = useState<WizardStep>(1);
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [mapping, setMapping] = useState<PromotionMapping>({});
  const [plan, setPlan] = useState<PromotionPreview | null>(null);

  const sourceClasses = useMemo(
    () => allClasses.filter((c) => c.schoolYear === fromYear),
    [allClasses, fromYear],
  );
  const targetClasses = useMemo(
    () => allClasses.filter((c) => c.schoolYear === toYear),
    [allClasses, toYear],
  );

  const yearsValid = fromYear.trim() !== '' && toYear.trim() !== '' && fromYear !== toYear;

  function resetPreview() {
    setPlan(null);
  }

  function setTargetFor(fromClassId: string, value: string) {
    resetPreview();
    setMapping((prev) => {
      const next = { ...prev };
      if (value === '') {
        delete next[fromClassId];
      } else {
        next[fromClassId] = value;
      }
      return next;
    });
  }

  function runPreview() {
    preview.mutate(
      { fromYear, toYear, mapping },
      {
        onSuccess: (data) => {
          setPlan(data);
          setStep(3);
        },
        onError: () => toast.error('Impossible de générer la prévisualisation.'),
      },
    );
  }

  function runCommit() {
    commit.mutate(
      { fromYear, toYear, mapping },
      {
        onSuccess: (res) => {
          toast.success(`${res.promoted} élèves promus.`);
          setPlan(null);
          setMapping({});
          setStep(1);
        },
        onError: () => toast.error('Le passage de classe a échoué.'),
      },
    );
  }

  if (classesQuery.isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Chargement des classes">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }
  if (classesQuery.isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
        <p className="text-sm text-rose-700 dark:text-rose-300">
          Impossible de charger les classes.
        </p>
        <button
          type="button"
          onClick={classesQuery.refetch}
          className="mt-3 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
        >
          Réessayer
        </button>
      </div>
    );
  }
  if (allClasses.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune classe n&apos;existe encore. Créez vos classes avant de lancer un passage.
        </p>
        <Link href="/classes" className="mt-3 inline-block text-sm font-medium text-navy-700 hover:underline">
          Gérer les classes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Stepper step={step} />

      {/* ── Step 1 — choose years ─────────────────────────────────────── */}
      {step === 1 && (
        <section aria-labelledby="step1-heading" className="space-y-4 rounded-xl border bg-card p-5">
          <h2 id="step1-heading" className="text-lg font-semibold">
            1. Années scolaires
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <YearField
              id="fromYear"
              label="Année source"
              value={fromYear}
              years={schoolYears}
              onChange={(v) => {
                resetPreview();
                setMapping({});
                setFromYear(v);
              }}
            />
            <YearField
              id="toYear"
              label="Année cible"
              value={toYear}
              years={schoolYears}
              onChange={(v) => {
                resetPreview();
                setToYear(v);
              }}
            />
          </div>
          {fromYear !== '' && fromYear === toYear && (
            <p className="text-sm text-rose-700 dark:text-rose-300">
              L&apos;année source et l&apos;année cible doivent être différentes.
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!yearsValid}
              onClick={() => setStep(2)}
              className="inline-flex h-9 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              Continuer
            </button>
          </div>
        </section>
      )}

      {/* ── Step 2 — map each source class ────────────────────────────── */}
      {step === 2 && (
        <section aria-labelledby="step2-heading" className="space-y-4 rounded-xl border bg-card p-5">
          <h2 id="step2-heading" className="text-lg font-semibold">
            2. Correspondance des classes ({fromYear} → {toYear})
          </h2>
          {sourceClasses.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Aucune classe pour l&apos;année {fromYear}.
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Pour chaque classe, choisissez une classe cible de {toYear}, « Diplômé / Sortie »
                pour les élèves qui quittent l&apos;établissement, ou laissez vide pour ignorer.
                Une classe cible manquante&nbsp;?{' '}
                <Link href="/classes" className="font-medium text-navy-700 hover:underline">
                  Créez-la d&apos;abord
                </Link>
                .
              </p>
              <ul className="space-y-3">
                {sourceClasses.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.level}</p>
                    </div>
                    <div className="sm:w-72">
                      <label htmlFor={`target-${c.id}`} className="sr-only">
                        Classe cible pour {c.name}
                      </label>
                      <select
                        id={`target-${c.id}`}
                        value={mapping[c.id] ?? ''}
                        onChange={(e) => setTargetFor(c.id, e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">— Ignorer cette classe —</option>
                        {targetClasses.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.level})
                          </option>
                        ))}
                        <option value={GRADUATED}>Diplômé / Sortie</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted/50"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={preview.isPending}
              onClick={runPreview}
              className="inline-flex h-9 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {preview.isPending ? 'Prévisualisation…' : 'Prévisualiser'}
            </button>
          </div>
        </section>
      )}

      {/* ── Step 3 — preview + commit ─────────────────────────────────── */}
      {step === 3 && (
        <section aria-labelledby="step3-heading" className="space-y-4 rounded-xl border bg-card p-5">
          <h2 id="step3-heading" className="text-lg font-semibold">
            3. Prévisualisation du passage
          </h2>
          {plan === null ? (
            <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Aucune prévisualisation. Revenez à l&apos;étape précédente pour la générer.
            </div>
          ) : plan.plan.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Aucune classe à traiter pour cette configuration.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      {PLAN_COLUMNS.map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plan.plan.map((row) => {
                      const targetName =
                        row.action === 'GRADUATE'
                          ? 'Diplômé / Sortie'
                          : row.toClassId
                            ? (targetClasses.find((t) => t.id === row.toClassId)?.name ??
                              row.toClassId)
                            : '—';
                      return (
                        <tr key={row.fromClassId} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm font-medium">{row.fromClassName}</td>
                          <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                            {row.studentCount}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_BADGE[row.action]}`}
                            >
                              {ACTION_LABELS[row.action]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{targetName}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground">
                Total : <span className="font-semibold tabular-nums text-foreground">{plan.total}</span>{' '}
                élève(s) concerné(s).
              </p>
            </>
          )}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted/50"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={plan === null || commit.isPending}
              onClick={runCommit}
              className="inline-flex h-9 items-center rounded-md bg-terracotta px-4 text-sm font-semibold text-white hover:bg-terracotta-dark disabled:opacity-50"
            >
              {commit.isPending ? 'Passage en cours…' : 'Confirmer le passage'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Stepper({ step }: { step: WizardStep }) {
  const steps: { n: WizardStep; label: string }[] = [
    { n: 1, label: 'Années' },
    { n: 2, label: 'Correspondance' },
    { n: 3, label: 'Confirmation' },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Étapes du passage de classe">
      {steps.map((s) => {
        const active = s.n === step;
        const done = s.n < step;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? 'bg-navy-700 text-white'
                  : done
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {s.n}
            </span>
            <span className={`text-sm ${active ? 'font-semibold' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface YearFieldProps {
  id: string;
  label: string;
  value: string;
  years: string[];
  onChange: (value: string) => void;
}

/** A school-year picker: known years as a datalist + free-text fallback. */
function YearField({ id, label, value, years, onChange }: YearFieldProps) {
  const listId = `${id}-years`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="2025-2026"
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <datalist id={listId}>
        {years.map((y) => (
          <option key={y} value={y} />
        ))}
      </datalist>
    </div>
  );
}
