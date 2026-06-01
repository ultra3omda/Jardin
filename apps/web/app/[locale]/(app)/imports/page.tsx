import { ImportsClient } from './imports-client';

export const dynamic = 'force-dynamic';

export default function ImportsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Importer des données</h1>
        <p className="text-sm text-muted-foreground">
          Téléchargez le modèle Excel/CSV du module, remplissez-le avec vos données, puis
          importez-le. Un test de validation est lancé avant tout enregistrement.
        </p>
      </header>
      <ImportsClient />
    </div>
  );
}
