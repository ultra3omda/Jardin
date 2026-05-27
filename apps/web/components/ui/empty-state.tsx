import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ActionWithHref = { label: string; href: string };
type ActionWithClick = { label: string; onClick: () => void };
type Action = ActionWithHref | ActionWithClick;

function isHrefAction(action: Action): action is ActionWithHref {
  return 'href' in action;
}

interface EmptyStateProps {
  /** Icon element rendered at the top (e.g. a Lucide icon) */
  icon: React.ReactNode;
  /** Main title — short, descriptive */
  title: string;
  /** Optional secondary text */
  description?: string;
  /** Optional CTA button (link or click handler) */
  action?: Action;
  className?: string;
}

/**
 * Reusable empty state component for tables, lists, and pages with no data.
 *
 * @example
 * <EmptyState
 *   icon={<Users className="h-8 w-8" />}
 *   title="Aucun élève"
 *   description="Ajoutez votre premier élève pour commencer."
 *   action={{ label: 'Ajouter un élève', href: '/students/new' }}
 * />
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className,
      )}
      role="status"
      aria-label={title}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-paper-100 text-ink-300"
        aria-hidden="true"
      >
        {icon}
      </div>

      <p className="mb-1 text-base font-semibold text-navy-900">{title}</p>

      {description && (
        <p className="mb-6 max-w-xs text-sm text-ink-500">{description}</p>
      )}

      {action && (
        <div className="mt-2">
          {isHrefAction(action) ? (
            <Button asChild variant="default" size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
