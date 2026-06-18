import type * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Base loading placeholder. Compose into higher-level skeletons (table, KPI,
 * card). Uses `bg-muted` (a defined token) — the previous ad-hoc `bg-paper-200`
 * did not exist in the Tailwind palette and rendered invisible.
 *
 * Marked `aria-hidden`: wrap a group in a container with
 * `role="status" aria-busy="true"` so screen readers announce loading once.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" {...props} />
  );
}
