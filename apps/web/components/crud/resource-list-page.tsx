'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
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
  /** Contextual empty-state icon (defaults to a generic inbox). */
  emptyIcon?: ReactNode;
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
  emptyIcon,
  skeletonCols = 4,
  children,
}: ResourceListPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} actions={action} />

      {isLoading ? (
        <TableSkeleton rows={5} cols={skeletonCols} />
      ) : isError ? (
        <ErrorRetry message={errorMessage} onRetry={onRetry} />
      ) : isEmpty ? (
        <EmptyState
          icon={emptyIcon ?? <Inbox className="h-8 w-8" aria-hidden="true" />}
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
