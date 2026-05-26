'use client';

import { useMutation } from '@tanstack/react-query';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { useState } from 'react';

import {
  bulkImportStudents,
  type BulkImportResponse,
} from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';

/**
 * V2 — Bulk import UI :
 *   1. Pick CSV → preview header attendu
 *   2. Tester (dry-run) → comptes + erreurs row-by-row
 *   3. Importer (uniquement si 0 erreur, atomique côté API)
 */
const CSV_HEADER =
  'firstName,lastName,dateOfBirth,sex,classroom,parentEmail,nationality,city,country,motherTongue,siblingsCount';

const CSV_EXAMPLE =
  'Alice,Ben Salem,2018-09-15,F,CP-A,parent@example.tn,TN,Tunis,TN,ar,0\n' +
  'Karim,Trabelsi,2017-03-08,M,CE1-B,karim.parent@example.tn,TN,Sousse,TN,ar,2';

export function BulkImportForm() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<BulkImportResponse | null>(null);

  const mut = useMutation({
    mutationFn: ({ f, dryRun }: { f: File; dryRun: boolean }) =>
      bulkImportStudents(accessToken!, f, dryRun),
    onSuccess: (res) => setReport(res),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setReport(null);
    const f = e.target.files?.[0];
    setFile(f ?? null);
  }

  const hasErrors = (report?.errors.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">1. Charger le fichier CSV</h2>
        <p className="mt-1 text-xs text-muted-foreground">Header attendu :</p>
        <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">{CSV_HEADER}</pre>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Voir un exemple
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">
            {CSV_HEADER}
            {'\n'}
            {CSV_EXAMPLE}
          </pre>
        </details>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="mt-4 block text-sm"
          aria-label="Fichier CSV"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!file || mut.isPending}
            onClick={() => file && mut.mutate({ f: file, dryRun: true })}
            className="h-10 rounded-md border px-4 text-sm font-medium disabled:opacity-50"
          >
            {mut.isPending ? 'Analyse…' : 'Tester (dry-run)'}
          </button>
          <button
            type="button"
            disabled={!file || mut.isPending || hasErrors}
            onClick={() => file && mut.mutate({ f: file, dryRun: false })}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            title={hasErrors ? 'Corrigez les erreurs avant import' : undefined}
          >
            {mut.isPending ? 'Import…' : 'Importer'}
          </button>
        </div>
        {mut.error && (
          <p className="mt-3 text-sm text-rose-600" role="alert">
            Erreur : {(mut.error as Error).message}
          </p>
        )}
      </section>

      {report && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">2. Résultat</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.dryRun
              ? 'Test (dry-run) — aucun élève n’a été inséré.'
              : 'Import effectué.'}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Valides</dt>
              <dd className="mt-0.5 text-2xl font-semibold text-emerald-700">{report.valid}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Erreurs</dt>
              <dd className="mt-0.5 text-2xl font-semibold text-rose-700">
                {report.errors.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Importés</dt>
              <dd className="mt-0.5 text-2xl font-semibold">{report.imported}</dd>
            </div>
          </dl>

          {hasErrors && (
            <div className="mt-4 max-h-80 overflow-y-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Ligne</th>
                    <th className="px-3 py-2 text-left">Erreur</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.errors.map((e, i) => (
                    <tr key={`${e.row}-${i}`}>
                      <td className="px-3 py-2 font-mono">{e.row}</td>
                      <td className="px-3 py-2 text-rose-700">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!report.dryRun && report.imported > 0 && (
            <div className="mt-4 rounded bg-emerald-50 p-4">
              <p className="text-sm text-emerald-900">
                ✅ {report.imported} élève{report.imported > 1 ? 's' : ''} importé
                {report.imported > 1 ? 's' : ''} avec succès.
              </p>
              <Link
                href={'/students' as Route}
                className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline"
              >
                Voir la liste →
              </Link>
            </div>
          )}

          {report.dryRun && !hasErrors && report.valid > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              ✓ Toutes les lignes sont valides. Cliquez sur <strong>Importer</strong> pour valider
              l&apos;insertion.
            </p>
          )}
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        <strong>Atomicité</strong> : si une seule ligne est en erreur, aucune n&apos;est insérée.
        Corrigez le CSV puis relancez l&apos;import.
      </p>
    </div>
  );
}
