import Link from 'next/link';
import { SHARED_VERSION, SUPPORTED_LOCALES } from '@ecole-saas/shared';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-8">
      <div className="w-full max-w-3xl">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 ring-1 ring-green-600/20">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Vague 1 livrée — Auth multi-tenant
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          École SaaS{' '}
          <span className="bg-gradient-to-r from-primary to-brand-700 bg-clip-text text-transparent">
            v0.2
          </span>
        </h1>

        <p className="mb-8 text-xl text-muted-foreground">
          Plateforme de gestion complète pour écoles et jardins d&apos;enfants.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Créer un établissement</Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <InfoTile label="Shared package" value={`v${SHARED_VERSION}`} />
          <InfoTile label="Langues" value={SUPPORTED_LOCALES.join(', ').toUpperCase()} />
        </div>

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          Déployé via GitHub Actions → Vercel
        </footer>
      </div>
    </main>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm">{value}</dd>
    </div>
  );
}
