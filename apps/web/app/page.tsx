import { SHARED_VERSION, SUPPORTED_LOCALES } from '@ecole-saas/shared';

export default function HomePage() {
  const buildTime = new Date().toISOString();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-3xl">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 ring-1 ring-green-600/20">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Pipeline CI/CD opérationnel
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight text-slate-900">
          École SaaS{' '}
          <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            v0.1
          </span>
        </h1>

        <p className="mb-8 text-xl text-slate-600">
          Plateforme de gestion complète pour écoles et jardins d&apos;enfants.
          Vague 0 : fondations posées, CI/CD opérationnel, déploiement automatique.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            label="Build time"
            value={buildTime}
            tone="default"
          />
          <InfoCard
            label="Shared package"
            value={`v${SHARED_VERSION}`}
            tone="brand"
          />
          <InfoCard
            label="Langues supportées"
            value={SUPPORTED_LOCALES.join(', ').toUpperCase()}
            tone="default"
          />
          <InfoCard
            label="Environnement"
            value={process.env.NODE_ENV ?? 'unknown'}
            tone="brand"
          />
        </div>

        <div className="mt-10 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            🚀 Prochaines vagues
          </h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <span className="font-mono text-brand-600">Vague 1</span> — Auth multi-tenant + Backend NestJS + PostgreSQL
            </li>
            <li>
              <span className="font-mono text-brand-600">Vague 2</span> — App Mobile (Expo) + Module Élèves
            </li>
            <li>
              <span className="font-mono text-brand-600">Vague 3</span> — Module Parents + Communication temps réel
            </li>
            <li>
              <span className="font-mono text-brand-600">Vague 4+</span> — RH, Paie, Stock, Cantine, Transport...
            </li>
          </ul>
        </div>

        <footer className="mt-12 text-center text-sm text-slate-400">
          Déployé via GitHub Actions → Vercel
        </footer>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'brand';
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        tone === 'brand'
          ? 'border-brand-200 bg-brand-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm text-slate-900">{value}</dd>
    </div>
  );
}
