import { Link } from '@/i18n/routing';

import { CommercialOrgsList } from './commercial-orgs';

export const dynamic = 'force-dynamic';

export default function CommercialPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organisations</h1>
          <p className="text-sm text-muted-foreground">
            Les établissements que vous avez signés et leur état d&apos;onboarding.
          </p>
        </div>
        <Link
          href="/commercial/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Nouvelle organisation signée
        </Link>
      </header>
      <CommercialOrgsList />
    </div>
  );
}
