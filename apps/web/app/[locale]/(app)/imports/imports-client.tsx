'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  downloadImportTemplate,
  listImportEntities,
  runImport,
  type ImportResult,
} from '@/lib/api/imports';
import { requireToken } from '@/lib/auth/require-token';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useToast } from '@/lib/ui/use-toast';

export function ImportsClient() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const toast = useToast();

  const { data: entities } = useQuery({
    queryKey: ['imports', 'entities'],
    queryFn: () => listImportEntities(requireToken(accessToken)),
    enabled: !!accessToken,
  });

  const [entityId, setEntityId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = entities ?? [];
  const selected = entityId || list[0]?.id || '';

  async function template(format: 'xlsx' | 'csv'): Promise<void> {
    if (!selected) return;
    try {
      await downloadImportTemplate(requireToken(accessToken), selected, format);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Téléchargement impossible.');
    }
  }

  async function submit(dryRun: boolean): Promise<void> {
    if (!selected || !file) {
      setError('Sélectionnez un module et un fichier.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await runImport(requireToken(accessToken), selected, file, dryRun);
      setResult(res);
      if (!dryRun && res.imported > 0) {
        toast.success(`${res.imported} ligne(s) importée(s).`);
      } else if (dryRun) {
        toast.success(
          res.errors.length === 0
            ? `Validation OK : ${res.valid}/${res.total} ligne(s) prêtes.`
            : `${res.errors.length} erreur(s) détectée(s).`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import impossible.');
    } finally {
      setBusy(false);
    }
  }

  const hasErrors = (result?.errors.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* 1. Choose module */}
      <section className="space-y-3 rounded-lg border bg-card p-6">
        <h2 className="text-base font-semibold text-navy-900">1. Choisir le module</h2>
        <select
          aria-label="Module à importer"
          className="h-10 w-full rounded-md border bg-white px-3 text-sm"
          value={selected}
          onChange={(e) => {
            setEntityId(e.target.value);
            setResult(null);
            setFile(null);
          }}
        >
          {list.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </section>

      {/* 2. Download template */}
      <section className="space-y-3 rounded-lg border bg-card p-6">
        <h2 className="text-base font-semibold text-navy-900">2. Télécharger le modèle</h2>
        <p className="text-sm text-muted-foreground">
          Le modèle contient les colonnes attendues, des exemples et une feuille d&apos;aide.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => template('xlsx')} disabled={!selected}>
            Modèle Excel (.xlsx)
          </Button>
          <Button variant="outline" size="sm" onClick={() => template('csv')} disabled={!selected}>
            Modèle CSV (.csv)
          </Button>
        </div>
      </section>

      {/* 3. Upload + validate + import */}
      <section className="space-y-3 rounded-lg border bg-card p-6">
        <h2 className="text-base font-semibold text-navy-900">3. Importer votre fichier</h2>
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
          className="block w-full text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => submit(true)} disabled={busy || !file}>
            {busy ? 'En cours…' : 'Tester (validation)'}
          </Button>
          <Button onClick={() => submit(false)} disabled={busy || !file || hasErrors}>
            {busy ? 'En cours…' : 'Importer'}
          </Button>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </section>

      {/* Report */}
      {result && (
        <section className="space-y-3 rounded-lg border bg-card p-6">
          <h2 className="text-base font-semibold text-navy-900">Résultat</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Lignes : <strong>{result.total}</strong></span>
            <span>Valides : <strong className="text-emerald-700">{result.valid}</strong></span>
            <span>Erreurs : <strong className="text-rose-700">{result.errors.length}</strong></span>
            {!result.dryRun && <span>Importées : <strong>{result.imported}</strong></span>}
          </div>
          {result.dryRun && result.errors.length === 0 && (
            <p className="text-sm text-emerald-700">
              ✓ Aucun problème détecté. Cliquez sur « Importer » pour enregistrer.
            </p>
          )}
          {result.errors.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Ligne</th>
                    <th className="px-3 py-2 text-left font-medium">Erreur</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 font-mono">{e.row}</td>
                      <td className="px-3 py-1.5 text-rose-700">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
