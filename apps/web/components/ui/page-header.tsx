import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  /** Page title — rendered as the single <h1>. */
  title: string;
  /** Optional one-line description under the title. */
  description?: string;
  /** Right-aligned actions (primary button, filters, etc.). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard page header used across every back-office page: a single <h1>
 * (accessibility: one per page), an optional description and a right-aligned
 * actions slot. Centralises the heading typography so titles stop drifting
 * between `text-2xl`/`text-xl` and bold/semibold per page.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
