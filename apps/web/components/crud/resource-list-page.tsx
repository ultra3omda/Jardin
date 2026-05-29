'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { ErrorRetry } from '@/components/ui/error-retry';
import { EmptyState } from '@/components/ui/empty-state';

type EmptyAction = { label: string; onClick: () => void } | { label: string; href: string };

export interface ResourceListPageProps {
  title: string;
  description?: string;
  action?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  errorMessage?: string;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: EmptyAction;
  skeletonCols?: number;
  children: ReactNode;
}

export function ResourceListPage({
  title,
  description,
  action,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  errorMessage,
  emptyTitle,
  emptyDescription,
  emptyAction,
  skeletonCols = 4,
  children,
}: ResourceListPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={skeletonCols} />
      ) : isError ? (
        <ErrorRetry message={errorMessage} onRetry={onRetry} />
      ) : isEmpty ? (
        <EmptyState
          icon={<Inbox className="h-8 w-8" aria-hidden="true" />}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        children
      )}
    </div>
  );
}
