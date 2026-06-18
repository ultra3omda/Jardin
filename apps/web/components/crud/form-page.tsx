'use client';
import type * as React from 'react';

import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

interface FormPageProps {
  title?: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
  error?: string | null;
  submitLabel?: string;
  cancelHref?: string;
  onCancel?: () => void;
  children: ReactNode;
}

/** Gabarit de formulaire : header + sections + erreur + footer d'actions collant. */
export function FormPage({
  title,
  description,
  onSubmit,
  submitting = false,
  error,
  submitLabel = 'Enregistrer',
  cancelHref,
  onCancel,
  children,
}: FormPageProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {title ? <PageHeader title={title} description={description} /> : null}

      <div className="space-y-5 rounded-lg border bg-card p-6">{children}</div>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t border-border bg-paper-50/90 px-2 py-3 backdrop-blur">
        {cancelHref ? (
          <Link href={cancelHref as never} className="text-sm font-medium text-muted-foreground hover:underline">
            Annuler
          </Link>
        ) : onCancel ? (
          <button type="button" onClick={onCancel} className="text-sm font-medium text-muted-foreground hover:underline">
            Annuler
          </button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Veuillez patienter…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Section de formulaire (légende + champs). */
export function FormSection({ legend, optional, children }: { legend: string; optional?: boolean; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-navy-900">
        {legend}
        {optional ? <span className="ml-1 text-xs font-normal text-muted-foreground">(optionnel)</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

/** Champ étiqueté (label + hint + contrôle). */
export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
