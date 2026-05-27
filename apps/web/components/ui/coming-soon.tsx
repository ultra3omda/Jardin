import type { LucideIcon } from 'lucide-react';
import { Wrench } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

/**
 * Placeholder page shown for modules under development.
 * Renders a consistent "coming soon" empty state within the app shell.
 */
export function ComingSoon({ title, description, icon: Icon = Wrench }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-slate-50 py-24 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <Icon className="h-8 w-8 text-ambre-500" aria-hidden="true" />
        </div>
        <p className="text-base font-semibold text-navy-800">Fonctionnalité à venir</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Ce module est en cours de développement et sera disponible prochainement.
        </p>
      </div>
    </div>
  );
}
