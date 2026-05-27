import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  /** Number of placeholder rows (default: 5) */
  rows?: number;
  /** Number of placeholder columns (default: 4) */
  cols?: number;
  className?: string;
}

const BAR_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-1/3'];

/**
 * Animated loading placeholder that mimics a data table layout.
 * Renders as div rows (not <table>) for flexibility inside any container.
 *
 * @example
 * {isLoading && <TableSkeleton rows={8} cols={5} />}
 */
export function TableSkeleton({ rows = 5, cols = 4, className }: TableSkeletonProps) {
  return (
    <div
      className={cn('w-full space-y-2', className)}
      aria-label="Chargement des données"
      aria-busy="true"
      role="status"
    >
      {/* Header row */}
      <div className="flex gap-4 px-4 pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3 flex-1 animate-pulse rounded bg-paper-200"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 rounded-lg border border-paper-100 bg-white px-4 py-3"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <div
              key={col}
              className={cn(
                'h-4 flex-1 animate-pulse rounded bg-paper-100',
                BAR_WIDTHS[(row * cols + col) % BAR_WIDTHS.length],
              )}
              style={{ animationDelay: `${(row + col) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
