import { BulkImportForm } from './bulk-import-form';

/**
 * V2 — Module Élèves : page `/students/bulk-import` (CSV upload).
 * Server component minimal — l'UI est dans le client `<BulkImportForm>`.
 */
export const dynamic = 'force-dynamic';

export default function BulkImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Import élèves (CSV)</h1>
        <p className="text-sm text-muted-foreground">
          Jusqu&apos;à 1000 élèves par fichier. Header obligatoire en première ligne.
        </p>
      </header>
      <BulkImportForm />
    </div>
  );
}
